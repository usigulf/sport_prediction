"""
Games and predictions endpoints
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime, timezone
from app.database import get_db
from app.utils.calendar_window import utc_bounds_for_calendar_day
from app.api.deps import get_current_user, get_current_user_optional, rate_limit_predictions
from app.schemas.game import GameResponse, GameListResponse
from app.utils.team_logo_urls import team_to_api_dict
from app.schemas.prediction import (
    PredictionResponse,
    PredictionExplanationResponse,
    FeatureImportance,
    RichAnalysisSections,
)
from app.schemas.common import PaginationParams, datetime_to_iso
from app.constants.leagues import LEAGUES_LIST
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.models.user_prediction_view import UserPredictionView
from app.services.prediction_service import PredictionService
from app.services.player_props_service import build_game_player_props
from app.services.explanation_service import get_model_feature_importance
from app.services.feature_builder import build_game_features
from app.services.analysis_context_service import enrich_rich_analysis, build_structured_game_analysis
from app.services.data_quality_service import compute_prediction_quality
from app.services.prediction_payload import build_prediction_api_payload
from app.utils.prediction_source import apply_prediction_source_production_gate
from app.services.share_image_service import generate_share_image
from app.services.share_referral_service import (
    build_share_card,
    build_share_deep_link,
    build_share_web_url,
)
from app.services.odds_service import get_market_odds_for_game, load_game_for_odds
from app.schemas.odds import MarketOddsResponse
from app.config import get_settings
from app.utils.subscription_tiers import is_free_tier_user

router = APIRouter()
logger = logging.getLogger(__name__)


def _game_specific_explanation_factors(game: Game, db: Session) -> list[FeatureImportance]:
    """
    Build matchup-specific factors from the same feature vector used for inference.
    This avoids showing only global model importance when local game context is available.
    """
    features, source = build_game_features(game, db)
    h_wr = float(features.get("home_team_win_rate", 0.5))
    a_wr = float(features.get("away_team_win_rate", 0.5))
    h_form = float(features.get("home_team_recent_form", 0.5))
    a_form = float(features.get("away_team_recent_form", 0.5))
    h_avg = float(features.get("home_team_avg_score", 0.0))
    a_avg = float(features.get("away_team_avg_score", 0.0))
    rest_h = int(features.get("rest_days_home", 4))
    rest_a = int(features.get("rest_days_away", 4))
    home_adv = float(features.get("home_advantage", 0.0))

    # Keep magnitudes bounded and easy to compare in UI.
    def _cap(v: float, limit: float = 1.0) -> float:
        return max(-limit, min(limit, v))

    factors: list[FeatureImportance] = [
        FeatureImportance.from_weight(
            feature="Season win-rate edge",
            weight=round(_cap((h_wr - a_wr) * 2.0), 4),
            description=f"Home {h_wr:.1%} vs away {a_wr:.1%} from current matchup feature inputs.",
        ),
        FeatureImportance.from_weight(
            feature="Recent form edge",
            weight=round(_cap((h_form - a_form) * 2.0), 4),
            description=f"Recent-form index home {h_form:.1%} vs away {a_form:.1%}.",
        ),
        FeatureImportance.from_weight(
            feature="Home advantage",
            weight=round(_cap(home_adv * 8.0), 4),
            description="Venue/home-field bump applied by the model.",
        ),
        FeatureImportance.from_weight(
            feature="Rest days differential",
            weight=round(_cap((rest_h - rest_a) / 7.0), 4),
            description=f"Home {rest_h}d rest vs away {rest_a}d.",
        ),
        FeatureImportance.from_weight(
            feature="Scoring environment tilt",
            weight=round(_cap((h_avg - a_avg) / max(1.0, (h_avg + a_avg) / 2.0)), 4),
            description=f"Expected scoring context home {h_avg:.2f} vs away {a_avg:.2f}.",
        ),
    ]
    # Most influential first.
    factors.sort(key=lambda f: abs(f.feature_weight), reverse=True)
    # Mention data source in top description for transparency.
    if factors:
        src = (
            "synced soccer standings"
            if source == "soccer_db_standings"
            else "provider standings fetch"
            if source == "soccer_sportradar_api"
            else "synthetic baseline inputs"
        )
        factors[0].description = f"{factors[0].description} Source: {src}."
    return factors


def _rich_analysis_from_prediction(prediction: Prediction) -> Optional[RichAnalysisSections]:
    raw = prediction.rich_analysis
    if not raw or not isinstance(raw, dict):
        return None
    try:
        model = RichAnalysisSections.model_validate(raw)
    except Exception:
        return None
    if not any(
        [
            model.real_time_analysis,
            model.form_standings,
            model.head_to_head,
            model.key_players,
            model.tactical,
            model.h2h_history,
            model.standings_context,
            model.advanced_metrics,
            model.scenario_outcomes,
        ]
    ):
        return None
    return model


@router.get("/leagues")
async def get_leagues():
    """
    List allowed league codes and labels for filters and favorites.
    Use in query params: league= or leagues= (comma-separated).
    """
    return {"leagues": LEAGUES_LIST}


def _team_to_response(team):
    """Serialize Team model to TeamResponse-compatible dict (no internal __dict__)."""
    return team_to_api_dict(team)


def _prediction_payload(db: Session, game: Game, prediction: Prediction) -> dict:
    return build_prediction_api_payload(db, game, prediction)


@router.get("/upcoming", response_model=GameListResponse)
async def get_upcoming_games(
    league: Optional[str] = Query(None, description="Filter by single league"),
    leagues: Optional[str] = Query(None, description="Filter by leagues (comma-separated, e.g. nfl,nba)"),
    date: Optional[str] = Query(
        None,
        description="Calendar day (YYYY-MM-DD). With time_zone, that day in the user's zone; without it, UTC midnight–midnight. Includes scheduled, live, and finished on that day.",
    ),
    time_zone: Optional[str] = Query(
        None,
        description="IANA timezone (e.g. America/New_York). Use with date so the day matches the device calendar.",
    ),
    pagination: PaginationParams = Depends(),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get games with predictions. Without date: future scheduled only. With date: all games that local calendar day."""
    prediction_service = PredictionService(db)
    now = datetime.now(timezone.utc)

    if date:
        try:
            start_utc, end_utc = utc_bounds_for_calendar_day(date, time_zone)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        query = db.query(Game).filter(
            Game.scheduled_time >= start_utc,
            Game.scheduled_time < end_utc,
            Game.status.in_(("scheduled", "live", "finished")),
        )
    else:
        query = db.query(Game).filter(
            Game.status == "scheduled",
            Game.scheduled_time >= now,
        )

    if leagues:
        league_list = [s.strip().lower() for s in leagues.split(",") if s.strip()]
        if league_list:
            query = query.filter(Game.league.in_(league_list))
    elif league:
        query = query.filter(Game.league == league)
    
    total = query.count()
    games = (
        query.options(joinedload(Game.home_team), joinedload(Game.away_team))
        .order_by(Game.scheduled_time)
        .offset(pagination.skip)
        .limit(pagination.limit)
        .all()
    )
    
    # Guests see schedules only; signed-in users get predictions subject to free-tier quota.
    include_predictions = current_user is not None
    
    games_data = []
    for game in games:
        game_dict = {
            "id": str(game.id),
            "league": game.league,
            "home_team_id": str(game.home_team_id),
            "away_team_id": str(game.away_team_id),
            "home_team": _team_to_response(game.home_team),
            "away_team": _team_to_response(game.away_team),
            "scheduled_time": datetime_to_iso(game.scheduled_time),
            "status": game.status,
            "home_score": game.home_score,
            "away_score": game.away_score,
            "venue": game.venue,
            "prediction": None
        }
        
        if include_predictions:
            prediction = prediction_service.get_latest_prediction(str(game.id))
            if prediction and prediction_service.grant_free_tier_prediction_view(
                current_user, game.id
            ):
                game_dict["prediction"] = _prediction_payload(db, game, prediction)
        
        games_data.append(game_dict)
    
    return {
        "games": games_data,
        "total": total,
        "skip": pagination.skip,
        "limit": pagination.limit
    }


@router.get("/{game_id}", response_model=GameResponse)
async def get_game(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional)
):
    """Get game details with prediction"""
    try:
        from uuid import UUID
        game_uuid = UUID(game_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game ID format")
    
    game = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == game_uuid)
        .first()
    )
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    prediction = None
    if current_user:
        prediction_service = PredictionService(db)
        latest = prediction_service.get_latest_prediction(game_id)
        if latest and prediction_service.grant_free_tier_prediction_view(current_user, game.id):
            prediction = latest
    
    game_dict = {
        "id": str(game.id),
        "league": game.league,
        "home_team_id": str(game.home_team_id),
        "away_team_id": str(game.away_team_id),
        "home_team": _team_to_response(game.home_team),
        "away_team": _team_to_response(game.away_team),
        "scheduled_time": datetime_to_iso(game.scheduled_time),
        "status": game.status,
        "home_score": game.home_score,
        "away_score": game.away_score,
        "venue": game.venue,
        "prediction": None
    }
    
    if prediction:
        game_dict["prediction"] = _prediction_payload(db, game, prediction)

    if not current_user:
        game_dict["guest_signup_required"] = True

    return game_dict


@router.get("/{game_id}/explanation", response_model=PredictionExplanationResponse)
async def get_prediction_explanation(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit_predictions),
):
    """Get explainability for the latest prediction (top factors, confidence, model info)."""
    from uuid import UUID
    try:
        UUID(game_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game ID format")
    prediction_service = PredictionService(db)
    prediction = prediction_service.get_latest_prediction(game_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    if is_free_tier_user(current_user):
        if not prediction_service.grant_free_tier_prediction_view(
            current_user, prediction.game_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Daily prediction limit reached. Upgrade to premium for full explanations."
            )
    game = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == prediction.game_id)
        .first()
    )
    settings = get_settings()
    quality = compute_prediction_quality(
        db,
        game,
        prediction,
        threshold=float(settings.min_data_quality_score),
    )
    quality, prediction_source = apply_prediction_source_production_gate(
        quality,
        prediction.model_version,
        environment=settings.environment,
        default_model_version=settings.ml_model_version,
    )

    # Record view for prediction history
    view = UserPredictionView(
        user_id=current_user.id,
        game_id=prediction.game_id,
        prediction_id=prediction.id,
    )
    db.add(view)
    db.commit()

    model_factors = get_model_feature_importance(
        None,
        league=game.league if game else None,
        base_model_dir=(settings.model_artifact_dir or settings.explanation_model_dir or "").strip()
        or None,
    )

    if quality["quality_gate_applied"]:
        top_features = []
        confidence_explanation = (
            "Detailed explanation is temporarily limited because current data quality is low. "
            "Try again after a fresh sync."
        )
    else:
        game_specific = _game_specific_explanation_factors(game, db)
        if game_specific:
            top_features = game_specific
            confidence_explanation = (
                f"This prediction has {prediction.confidence_level} confidence. "
                "Factors below are computed from this matchup's current feature snapshot."
            )
        elif model_factors:
            top_features = [
                FeatureImportance.from_weight(
                    feature=f["feature"],
                    weight=f.get("feature_weight", f.get("shap_value", 0)),
                    description=f.get("description"),
                )
                for f in model_factors[:10]
            ]
            confidence_explanation = (
                f"This prediction has {prediction.confidence_level} confidence. "
                "Factors below are global logistic-regression weights from the trained "
                f"{(game.league or 'league').replace('_', ' ')} model."
            )
        else:
            home_prob = float(prediction.home_win_probability)
            away_prob = float(prediction.away_win_probability)
            top_features = [
                FeatureImportance.from_weight(
                    feature="Home win probability",
                    weight=home_prob - 0.5,
                    description="Model estimate for home team",
                ),
                FeatureImportance.from_weight(
                    feature="Away win probability",
                    weight=away_prob - 0.5,
                    description="Model estimate for away team",
                ),
                FeatureImportance.from_weight(
                    feature="Confidence",
                    weight=abs(home_prob - 0.5) * 2,
                    description=f"Confidence level: {prediction.confidence_level}",
                ),
            ]
            confidence_explanation = (
                f"This prediction has {prediction.confidence_level} confidence. "
                "Factors below summarize how strongly the model leans on each side."
            )
    base_rich_analysis = _rich_analysis_from_prediction(prediction)
    rich_analysis = base_rich_analysis
    structured_analysis = None
    try:
        rich_analysis = enrich_rich_analysis(
            db,
            game,
            prediction,
            base_rich_analysis,
        )
    except Exception:
        logger.exception(
            "Failed to enrich rich analysis; falling back to stored narrative",
            extra={"game_id": game_id, "prediction_id": str(prediction.id)},
        )
    try:
        structured_analysis = build_structured_game_analysis(db, game)
    except Exception:
        logger.exception(
            "Failed to build structured analysis; returning explanation without structured block",
            extra={"game_id": game_id, "prediction_id": str(prediction.id)},
        )
    return PredictionExplanationResponse(
        top_features=top_features,
        confidence_explanation=confidence_explanation,
        model_version=prediction.model_version,
        prediction_source=prediction_source,
        accuracy=None,
        data_quality_score=quality["data_quality_score"],
        data_quality_label=quality["data_quality_label"],
        quality_gate_applied=quality["quality_gate_applied"],
        quality_reasons=quality["quality_reasons"],
        rich_analysis=rich_analysis,
        structured_analysis=structured_analysis,
    )


@router.get("/{game_id}/player-props")
async def get_game_player_props(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit_predictions),
):
    """Model-projected player props for a game. Premium only; not sportsbook lines."""
    if is_free_tier_user(current_user):
        raise HTTPException(
            status_code=403,
            detail="Player props require a premium subscription."
        )
    game = db.query(Game).options(
        joinedload(Game.home_team),
        joinedload(Game.away_team),
    ).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    prediction = PredictionService(db).get_latest_prediction(game_id)
    return build_game_player_props(db, game, prediction)


@router.get("/{game_id}/market-odds", response_model=MarketOddsResponse)
async def get_market_odds(
    game_id: str,
    db: Session = Depends(get_db),
    _: None = Depends(rate_limit_predictions),
):
    """
    Read-only consensus sportsbook lines for model comparison (M-01 spike).
    Requires CLEARSPORTS_API_KEY (or optional ODDS_API_KEY). Informational only — not betting advice.
    """
    game = load_game_for_odds(db, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return get_market_odds_for_game(db, game)


@router.get("/{game_id}/live-predictions")
async def get_live_predictions(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit_predictions),
):
    """Live win-probability for premium users. In-play v0 when game is live and model was refreshed after kickoff."""
    if is_free_tier_user(current_user):
        raise HTTPException(
            status_code=403,
            detail="Live predictions require a premium subscription."
        )
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    prediction = PredictionService(db).get_latest_prediction(game_id, use_cache=False)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    from app.services.live_prediction_service import build_live_prediction_payload

    return build_live_prediction_payload(game, prediction)


@router.get("/{game_id}/predictions", response_model=PredictionResponse)
async def get_prediction(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit_predictions),
):
    """Get prediction for a game (requires authentication)"""
    prediction_service = PredictionService(db)

    prediction = prediction_service.get_latest_prediction(game_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

    if is_free_tier_user(current_user):
        if not prediction_service.grant_free_tier_prediction_view(
            current_user, prediction.game_id
        ):
            raise HTTPException(
                status_code=403,
                detail="Daily prediction limit reached. Upgrade to premium for unlimited predictions."
            )

    # Record view for prediction history
    view = UserPredictionView(
        user_id=current_user.id,
        game_id=prediction.game_id,
        prediction_id=prediction.id,
    )
    db.add(view)
    db.commit()

    game = db.query(Game).filter(Game.id == prediction.game_id).first()
    return _prediction_payload(db, game, prediction)


@router.post("/{game_id}/share")
async def share_pick(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Generate share content for this game's pick: text message and optional share graphic (base64 PNG).
    Pick confidence is only included when the caller is allowed to view that prediction
    (signed-in + free-tier quota, or premium).
    """
    try:
        from uuid import UUID

        game_uuid = UUID(game_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game ID format")

    game = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == game_uuid)
        .first()
    )
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    prediction_service = PredictionService(db)
    pred = prediction_service.get_latest_prediction(game_id)
    home_name = game.home_team.name if game.home_team else "Home"
    away_name = game.away_team.name if game.away_team else "Away"
    league = getattr(game, "league", None)

    confidence = None
    home_prob = None
    away_prob = None
    if current_user and pred:
        if not prediction_service.grant_free_tier_prediction_view(current_user, game_uuid):
            raise HTTPException(
                status_code=403,
                detail="Daily prediction limit reached. Upgrade to premium for unlimited predictions.",
            )
        confidence = pred.confidence_level
        home_prob = float(pred.home_win_probability)
        away_prob = float(pred.away_win_probability)

    referrer_id = current_user.id if current_user else None
    share_url = build_share_web_url(game_uuid, referrer_id)
    deep_link = build_share_deep_link(game_uuid, referrer_id)
    card = build_share_card(
        home_name=home_name,
        away_name=away_name,
        league=league,
        confidence=confidence,
        home_win_probability=home_prob,
        away_win_probability=away_prob,
        referrer_id=referrer_id,
    )

    message = f"Octobet pick: {home_name} vs {away_name}"
    if confidence:
        message += f" ({confidence} confidence)"
    if card.get("favored_team") and card.get("pick_probability_pct") is not None:
        message += f" — {card['favored_team']} ({card['pick_probability_pct']}%)"
    message += " — Get picks in the app."
    message += f"\n{share_url}"

    image_base64 = generate_share_image(
        home_name=home_name,
        away_name=away_name,
        confidence=confidence,
        league=league,
        favored_team=card.get("favored_team"),
        pick_probability_pct=card.get("pick_probability_pct"),
        share_url=share_url,
    )
    return {
        "share_url": share_url,
        "deep_link": deep_link,
        "message": message,
        "image_base64": image_base64,
        "card": card,
    }
