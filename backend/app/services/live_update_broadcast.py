"""Build live update payloads for WebSocket broadcast."""
from __future__ import annotations

from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import joinedload

from app.database import SessionLocal
from app.models.game import Game
from app.services.live_prediction_service import (
    build_live_prediction_payload,
    prediction_source_label,
)
from app.services.prediction_service import PredictionService


def build_live_update_message(game_id: str) -> Optional[dict[str, Any]]:
    """
    Snapshot payload for /ws/live subscribers. Returns None when the game does not exist.
    """
    db = SessionLocal()
    try:
        try:
            game_uuid = UUID(str(game_id).strip())
        except ValueError:
            return {"type": "error", "game_id": str(game_id), "error": "Invalid game id"}

        game = (
            db.query(Game)
            .options(joinedload(Game.home_team), joinedload(Game.away_team))
            .filter(Game.id == game_uuid)
            .first()
        )
        if not game:
            return {"type": "error", "game_id": str(game_uuid), "error": "Game not found"}

        prediction = PredictionService(db).get_latest_prediction(str(game_uuid), use_cache=False)
        if prediction:
            payload = build_live_prediction_payload(game, prediction)
            return {"type": "update", "game_id": str(game_uuid), **payload}

        return {
            "type": "update",
            "game_id": str(game_uuid),
            "home_score": game.home_score or 0,
            "away_score": game.away_score or 0,
            "home_win_probability": 0.5,
            "away_win_probability": 0.5,
            "confidence_level": None,
            "prediction_updated_at": None,
            "game_status": game.status,
            "is_in_play": False,
            "prediction_source": prediction_source_label(game, None),
        }
    finally:
        db.close()
