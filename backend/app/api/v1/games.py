"""
Games and predictions endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc
from typing import Optional
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from app.database import get_db
from app.api.deps import get_current_user, get_current_user_optional, rate_limit_predictions
from app.schemas.game import GameResponse, GameListResponse, TeamResponse
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
from app.services.explanation_service import get_model_feature_importance
from app.services.analysis_context_service import enrich_rich_analysis, build_structured_game_analysis
from app.services.share_image_service import generate_share_image
from app.config import get_settings

router = APIRouter()


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
    if not team:
        return None
    return TeamResponse.model_validate(team).model_dump()


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
            date_obj = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        tz_name = (time_zone or "").strip()
        if tz_name:
            try:
                tz = ZoneInfo(tz_name)
            except Exception:
                raise HTTPException(
                    status_code=400,
                    detail="Invalid time_zone; use an IANA name (e.g. America/New_York, Europe/London)",
                )
            start_local = datetime.combine(date_obj, datetime.min.time(), tzinfo=tz)
            end_local = start_local + timedelta(days=1)
            start_utc = start_local.astimezone(timezone.utc)
            end_utc = end_local.astimezone(timezone.utc)
        else:
            start_utc = datetime.combine(date_obj, datetime.min.time(), tzinfo=timezone.utc)
            end_utc = start_utc + timedelta(days=1)
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
                game_dict["prediction"] = {
                    "id": str(prediction.id),
                    "game_id": str(prediction.game_id),
                    "model_version": prediction.model_version,
                    "home_win_probability": float(prediction.home_win_probability),
                    "away_win_probability": float(prediction.away_win_probability),
                    "expected_home_score": float(prediction.expected_home_score) if prediction.expected_home_score else None,
                    "expected_away_score": float(prediction.expected_away_score) if prediction.expected_away_score else None,
                    "confidence_level": prediction.confidence_level,
                    "created_at": prediction.created_at
                }
        
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
    
    game = db.query(Game).filter(Game.id == game_uuid).first()
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
        game_dict["prediction"] = {
            "id": str(prediction.id),
            "game_id": str(prediction.game_id),
            "model_version": prediction.model_version,
            "home_win_probability": float(prediction.home_win_probability),
            "away_win_probability": float(prediction.away_win_probability),
            "expected_home_score": float(prediction.expected_home_score) if prediction.expected_home_score else None,
            "expected_away_score": float(prediction.expected_away_score) if prediction.expected_away_score else None,
            "confidence_level": prediction.confidence_level,
            "created_at": prediction.created_at
        }
    
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

    if model_factors:
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
    rich_analysis = enrich_rich_analysis(
        db,
        game,
        prediction,
        _rich_analysis_from_prediction(prediction),
    )
    structured_analysis = build_structured_game_analysis(db, game)
    return PredictionExplanationResponse(
        top_features=top_features,
        confidence_explanation=confidence_explanation,
        model_version=prediction.model_version,
        accuracy=None,
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
    """Player prop predictions for a game (stub). Premium only."""
    if current_user.subscription_tier == "free":
        raise HTTPException(
            status_code=403,
            detail="Player props require a premium subscription."
        )
    # Verify game exists
    game = db.query(Game).options(
        joinedload(Game.home_team),
        joinedload(Game.away_team),
    ).filter(Game.id == game_id).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    # Stub: return empty or sample props. Replace with real ML/DB when available.
    home_name = (game.home_team and game.home_team.name) or "Home"
    away_name = (game.away_team and game.away_team.name) or "Away"
    props = [
        {"player_name": f"Player (Home)", "team": home_name, "prop_type": "points", "predicted_value": 18.5, "line": 17.5, "unit": "pts"},
        {"player_name": f"Player (Away)", "team": away_name, "prop_type": "points", "predicted_value": 16.2, "line": 15.0, "unit": "pts"},
    ]
    return {"game_id": game_id, "props": props}


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

    return {
        "id": str(prediction.id),
        "game_id": str(prediction.game_id),
        "model_version": prediction.model_version,
        "home_win_probability": float(prediction.home_win_probability),
        "away_win_probability": float(prediction.away_win_probability),
        "expected_home_score": float(prediction.expected_home_score) if prediction.expected_home_score else None,
        "expected_away_score": float(prediction.expected_away_score) if prediction.expected_away_score else None,
        "confidence_level": prediction.confidence_level,
        "created_at": prediction.created_at
    }


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
