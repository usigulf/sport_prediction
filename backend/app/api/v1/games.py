"""
Games and predictions endpoints
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc
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
from app.services.share_image_service import generate_share_image
from app.config import get_settings

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
        FeatureImportance(
            feature="Season win-rate edge",
            shap_value=round(_cap((h_wr - a_wr) * 2.0), 4),
            description=f"Home {h_wr:.1%} vs away {a_wr:.1%} from current matchup feature inputs.",
        ),
        FeatureImportance(
            feature="Recent form edge",
            shap_value=round(_cap((h_form - a_form) * 2.0), 4),
            description=f"Recent-form index home {h_form:.1%} vs away {a_form:.1%}.",
        ),
        FeatureImportance(
            feature="Home advantage",
            shap_value=round(_cap(home_adv * 8.0), 4),
            description="Venue/home-field bump applied by the model.",
        ),
        FeatureImportance(
            feature="Rest days differential",
            shap_value=round(_cap((rest_h - rest_a) / 7.0), 4),
            description=f"Home {rest_h}d rest vs away {rest_a}d.",
        ),
        FeatureImportance(
            feature="Scoring environment tilt",
            shap_value=round(_cap((h_avg - a_avg) / max(1.0, (h_avg + a_avg) / 2.0)), 4),
            description=f"Expected scoring context home {h_avg:.2f} vs away {a_avg:.2f}.",
        ),
    ]
    # Most influential first.
    factors.sort(key=lambda f: abs(f.shap_value), reverse=True)
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
    settings = get_settings()
    quality = compute_prediction_quality(
        db,
        game,
        prediction,
        threshold=float(settings.min_data_quality_score),
    )
    expected_home = float(prediction.expected_home_score) if prediction.expected_home_score else None
    expected_away = float(prediction.expected_away_score) if prediction.expected_away_score else None
    confidence_level = prediction.confidence_level
    if quality["quality_gate_applied"]:
        # Do not present detailed scoreline when source quality is low.
        expected_home = None
        expected_away = None
        confidence_level = "low"
    return {
        "id": str(prediction.id),
        "game_id": str(prediction.game_id),
        "model_version": prediction.model_version,
        "home_win_probability": float(prediction.home_win_probability),
        "away_win_probability": float(prediction.away_win_probability),
        "expected_home_score": expected_home,
        "expected_away_score": expected_away,
        "confidence_level": confidence_level,
        "data_quality_score": quality["data_quality_score"],
        "data_quality_label": quality["data_quality_label"],
        "quality_gate_applied": quality["quality_gate_applied"],
        "quality_reasons": quality["quality_reasons"],
        "created_at": prediction.created_at,
    }


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
    
    # Include predictions if user has access
    include_predictions = True
    if current_user and current_user.subscription_tier == "free":
        if prediction_service.has_exceeded_daily_limit(current_user.id):
            include_predictions = False
    
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
            if prediction:
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
        if current_user.subscription_tier in ["premium", "premium_plus"]:
            prediction = prediction_service.get_latest_prediction(game_id)
        elif current_user.subscription_tier == "free":
            if not prediction_service.has_exceeded_daily_limit(current_user.id):
                prediction = prediction_service.get_latest_prediction(game_id)
    
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
        game_uuid = UUID(game_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid game ID format")
    prediction_service = PredictionService(db)
    if current_user.subscription_tier == "free" and prediction_service.has_exceeded_daily_limit(current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Daily prediction limit reached. Upgrade to premium for full explanations."
        )
    prediction = prediction_service.get_latest_prediction(game_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    game = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == prediction.game_id)
        .first()
    )
    quality = compute_prediction_quality(
        db,
        game,
        prediction,
        threshold=float(get_settings().min_data_quality_score),
    )

    # Record view for prediction history
    view = UserPredictionView(
        user_id=current_user.id,
        game_id=prediction.game_id,
        prediction_id=prediction.id,
    )
    db.add(view)
    db.commit()

    settings = get_settings()
    model_factors = get_model_feature_importance(settings.explanation_model_dir)

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
                FeatureImportance(feature=f["feature"], shap_value=f["shap_value"], description=f.get("description"))
                for f in model_factors[:10]
            ]
            confidence_explanation = (
                f"This prediction has {prediction.confidence_level} confidence. "
                "Factors below are the model's global feature importance (what drives predictions overall)."
            )
        else:
            home_prob = float(prediction.home_win_probability)
            away_prob = float(prediction.away_win_probability)
            top_features = [
                FeatureImportance(feature="Home win probability", shap_value=home_prob - 0.5, description="Model estimate for home team"),
                FeatureImportance(feature="Away win probability", shap_value=away_prob - 0.5, description="Model estimate for away team"),
                FeatureImportance(feature="Confidence", shap_value=abs(home_prob - 0.5) * 2, description=f"Confidence level: {prediction.confidence_level}"),
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
    if current_user.subscription_tier == "free":
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


@router.get("/{game_id}/live-predictions")
async def get_live_predictions(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit_predictions),
):
    """Live in-play prediction (stub: returns latest pre-game until live pipeline exists). Premium only."""
    if current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=403,
            detail="Live predictions require a premium subscription."
        )
    prediction = PredictionService(db).get_latest_prediction(game_id, use_cache=False)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")
    return {
        "home_win_probability": float(prediction.home_win_probability),
        "away_win_probability": float(prediction.away_win_probability),
        "confidence_level": prediction.confidence_level,
        "model_version": prediction.model_version,
    }


@router.get("/{game_id}/predictions", response_model=PredictionResponse)
async def get_prediction(
    game_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(rate_limit_predictions),
):
    """Get prediction for a game (requires authentication)"""
    prediction_service = PredictionService(db)
    
    # Check subscription tier
    if current_user.subscription_tier == "free":
        if prediction_service.has_exceeded_daily_limit(current_user.id):
            raise HTTPException(
                status_code=403,
                detail="Daily prediction limit reached. Upgrade to premium for unlimited predictions."
            )
        prediction_service.increment_daily_prediction_count(current_user.id)
    
    prediction = prediction_service.get_latest_prediction(game_id)
    if not prediction:
        raise HTTPException(status_code=404, detail="Prediction not found")

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
    current_user: User = Depends(get_current_user_optional),
):
    """
    Generate share content for this game's pick: text message and optional share graphic (base64 PNG).
    """
    game = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == game_id)
        .first()
    )
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    pred = PredictionService(db).get_latest_prediction(game_id)
    home_name = game.home_team.name if game.home_team else "Home"
    away_name = game.away_team.name if game.away_team else "Away"
    confidence = pred.confidence_level if pred else None
    league = getattr(game, "league", None)
    message = f"Octobet pick: {home_name} vs {away_name}"
    if confidence:
        message += f" ({confidence} confidence)"
    message += " — Get picks in the app."
    image_base64 = generate_share_image(
        home_name=home_name,
        away_name=away_name,
        confidence=confidence,
        league=league,
    )
    return {"share_url": None, "message": message, "image_base64": image_base64}
