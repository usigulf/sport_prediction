"""
Shared serialization for prediction objects returned by games and feed endpoints.
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.game import Game
from app.models.prediction import Prediction
from app.services.data_quality_service import (
    compute_prediction_quality,
    league_standings_last_updated_iso,
)
from app.utils.prediction_source import apply_prediction_source_production_gate


def build_prediction_api_payload(
    db: Session,
    game: Game,
    prediction: Prediction,
) -> dict:
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
        strict_suppression=bool(settings.strict_low_trust_suppression),
    )
    gate = bool(quality["quality_gate_applied"])
    expected_home = float(prediction.expected_home_score) if prediction.expected_home_score else None
    expected_away = float(prediction.expected_away_score) if prediction.expected_away_score else None
    confidence_level = prediction.confidence_level
    home_p = float(prediction.home_win_probability)
    away_p = float(prediction.away_win_probability)
    probabilities_suppressed = False
    if gate:
        expected_home = None
        expected_away = None
        confidence_level = None
        if bool(settings.strict_low_trust_suppression):
            # Do not leak baseline/heuristic probabilities as if they were ML picks.
            home_p = None
            away_p = None
            probabilities_suppressed = True
        else:
            confidence_level = "low"
    return {
        "id": str(prediction.id),
        "game_id": str(prediction.game_id),
        "model_version": prediction.model_version,
        "prediction_source": prediction_source,
        "home_win_probability": home_p,
        "away_win_probability": away_p,
        "expected_home_score": expected_home,
        "expected_away_score": expected_away,
        "confidence_level": confidence_level,
        "data_quality_score": quality["data_quality_score"],
        "data_quality_label": quality["data_quality_label"],
        "quality_gate_applied": gate,
        "quality_reasons": quality["quality_reasons"],
        "probabilities_suppressed": probabilities_suppressed,
        "created_at": prediction.created_at,
        "standings_last_updated_iso": league_standings_last_updated_iso(db, game.league),
    }
