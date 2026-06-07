"""
In-play prediction helpers (v0): score-adjusted re-runs tagged with inplay_v0.

Full ML in-play models can replace this layer later; clients read the same fields.
"""
from __future__ import annotations

from datetime import timezone
from typing import Any, Optional

from app.models.game import Game
from app.models.prediction import Prediction

INPLAY_VERSION_MARKER = "inplay_v0"


def tag_inplay_model_version(model_version: str) -> str:
    """Suffix model version when inference runs during a live game."""
    mv = (model_version or "").strip() or "heuristic"
    if INPLAY_VERSION_MARKER in mv.lower():
        return mv[:50]
    tagged = f"{mv}_{INPLAY_VERSION_MARKER}"
    return tagged[:50]


def is_in_play_prediction(game: Game, prediction: Optional[Prediction]) -> bool:
    """True when the latest row reflects a live-game refresh (not kickoff-only pre-game)."""
    if not game or (game.status or "").lower() != "live" or not prediction:
        return False
    mv = (prediction.model_version or "").lower()
    if INPLAY_VERSION_MARKER in mv:
        return True
    if not prediction.created_at or not game.scheduled_time:
        return False
    kickoff = game.scheduled_time
    if kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)
    created = prediction.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return created >= kickoff


def prediction_source_label(game: Game, prediction: Optional[Prediction]) -> str:
    if is_in_play_prediction(game, prediction):
        return "score_adjusted_inplay_v0"
    return "pregame"


def build_live_prediction_payload(game: Game, prediction: Prediction) -> dict[str, Any]:
    in_play = is_in_play_prediction(game, prediction)
    return {
        "home_win_probability": float(prediction.home_win_probability),
        "away_win_probability": float(prediction.away_win_probability),
        "confidence_level": prediction.confidence_level,
        "model_version": prediction.model_version,
        "prediction_updated_at": prediction.created_at.isoformat()
        if prediction.created_at
        else None,
        "game_status": game.status,
        "home_score": game.home_score or 0,
        "away_score": game.away_score or 0,
        "is_in_play": in_play,
        "prediction_source": prediction_source_label(game, prediction),
    }
