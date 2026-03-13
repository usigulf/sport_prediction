"""
Feed endpoints: top picks, for-you (stub)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from datetime import datetime
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user_optional
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.schemas.game import TeamResponse
from app.schemas.common import datetime_to_iso
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/feed", tags=["feed"])


def _team_to_response(team):
    if not team:
        return None
    return TeamResponse.model_validate(team).model_dump()


def _confidence_order(cl: Optional[str]) -> int:
    """Order: high=0, medium=1, low=2, null=3."""
    if cl == "high":
        return 0
    if cl == "medium":
        return 1
    if cl == "low":
        return 2
    return 3


@router.get("/top-picks")
async def get_top_picks(
    leagues: Optional[str] = Query(None, description="Filter by leagues (comma-separated)"),
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Today's top picks: upcoming games with predictions, ordered by confidence (high first)
    then by scheduled time. Public; if user is free and over daily limit, predictions are omitted.
    """
    now = datetime.now()
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
    query = (
        db.query(Game)
        .filter(
            Game.status == "scheduled",
            Game.scheduled_time >= now,
            Game.scheduled_time <= today_end,
        )
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
    )
    if leagues:
        league_list = [s.strip().lower() for s in leagues.split(",") if s.strip()]
        if league_list:
            query = query.filter(Game.league.in_(league_list))

    games = query.order_by(Game.scheduled_time).limit(limit * 2).all()
    prediction_service = PredictionService(db)
    include_predictions = True
    if current_user and current_user.subscription_tier == "free":
        if prediction_service.has_exceeded_daily_limit(current_user.id):
            include_predictions = False

    # Attach latest prediction and sort by confidence then time
    with_pred = []
    for game in games:
        pred = prediction_service.get_latest_prediction(str(game.id))
        if not pred and include_predictions:
            continue
        with_pred.append((game, pred))

    if include_predictions:
        with_pred.sort(
            key=lambda x: (
                _confidence_order(x[1].confidence_level if x[1] else None),
                x[0].scheduled_time,
            )
        )

    top = with_pred[:limit]
    picks = []
    for game, pred in top:
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
            "prediction": None,
        }
        if pred and include_predictions:
            game_dict["prediction"] = {
                "id": str(pred.id),
                "game_id": str(pred.game_id),
                "model_version": pred.model_version,
                "home_win_probability": float(pred.home_win_probability),
                "away_win_probability": float(pred.away_win_probability),
                "expected_home_score": float(pred.expected_home_score) if pred.expected_home_score else None,
                "expected_away_score": float(pred.expected_away_score) if pred.expected_away_score else None,
                "confidence_level": pred.confidence_level,
                "created_at": pred.created_at,
            }
        picks.append(game_dict)

    return {"picks": picks, "count": len(picks)}
