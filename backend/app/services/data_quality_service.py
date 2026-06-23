"""
Data quality scoring for predictions and explanations.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.prediction import Prediction
from app.models.team_standing import TeamStanding


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def compute_prediction_quality(
    db: Session,
    game: Game | None,
    prediction: Prediction | None,
    *,
    threshold: float,
) -> dict[str, Any]:
    """
    Returns deterministic, explainable quality metadata used to gate low-trust output.
    """
    if not game or not prediction:
        return {
            "data_quality_score": 0.0,
            "data_quality_label": "low",
            "quality_gate_applied": True,
            "quality_reasons": ["Missing game or prediction context."],
        }

    reasons: list[str] = []
    score = 1.0

    hp = float(prediction.home_win_probability or 0.0)
    ap = float(prediction.away_win_probability or 0.0)
    prob_sum = hp + ap
    if hp < 0 or hp > 1 or ap < 0 or ap > 1:
        score -= 0.45
        reasons.append("Probabilities were outside [0, 1].")
    if prob_sum < 0.55 or prob_sum > 1.05:
        score -= 0.2
        reasons.append("Probability mass looked inconsistent.")

    if prediction.expected_home_score is None or prediction.expected_away_score is None:
        score -= 0.12
        reasons.append("Expected score inputs were incomplete.")

    created_at = prediction.created_at
    if created_at is not None:
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        age_h = (_now_utc() - created_at).total_seconds() / 3600.0
        if age_h > 72:
            score -= 0.3
            reasons.append("Prediction was stale (>72h).")
        elif age_h > 24:
            score -= 0.18
            reasons.append("Prediction was not recently refreshed (>24h).")

    league = (game.league or "").strip()
    if league:
        standings_count = (
            db.query(TeamStanding)
            .filter(TeamStanding.league == league)
            .count()
        )
        if standings_count == 0:
            score -= 0.1
            reasons.append("League standings coverage is currently missing.")

    model_version = (prediction.model_version or "").lower()
    if "synthetic" in model_version or model_version.endswith("_demo"):
        score -= 0.35
        reasons.append(
            "This league uses placeholder inputs until full standings sync is available."
        )

    score = max(0.0, min(1.0, score))
    if score >= 0.75:
        label = "high"
    elif score >= 0.5:
        label = "medium"
    else:
        label = "low"

    gate = score < threshold
    if gate and not reasons:
        reasons.append("Data quality was below the minimum threshold.")

    return {
        "data_quality_score": round(score, 2),
        "data_quality_label": label,
        "quality_gate_applied": gate,
        "quality_reasons": reasons,
    }


def league_standings_last_updated_iso(db: Session, league: str | None) -> str | None:
    """Latest standings sync timestamp for a league (for pick-card freshness badges)."""
    code = (league or "").strip()
    if not code:
        return None
    updated = (
        db.query(func.max(TeamStanding.updated_at))
        .filter(TeamStanding.league == code)
        .scalar()
    )
    if updated is None:
        return None
    if updated.tzinfo is None:
        updated = updated.replace(tzinfo=timezone.utc)
    return updated.isoformat()
