"""
Batch inference job: build features → run ML (or heuristic) → insert Prediction → invalidate cache.
Call from cron via POST /internal/predictions/run or scripts/run_predictions_job.py.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Optional
from uuid import UUID, uuid4

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.game import Game
from app.models.prediction import Prediction
from app.services.feature_builder import build_feature_dict, expected_scores_for_league
from app.services.ml_artifacts import heuristic_predict, predict_from_artifacts
from app.services.prediction_service import PredictionService

logger = logging.getLogger(__name__)


@dataclass
class PredictionJobResult:
    games_considered: int
    predictions_written: int
    skipped_cooldown: int
    errors: list[str]


def _model_dir() -> Optional[str]:
    s = get_settings()
    d = s.model_artifact_dir or s.explanation_model_dir
    return d.strip() if d else None


def _should_skip(
    db: Session,
    game: Game,
    *,
    force: bool,
    min_minutes_scheduled: int,
    min_minutes_live: int,
) -> bool:
    if force:
        return False
    ps = PredictionService(db)
    latest = ps.get_latest_prediction(str(game.id), use_cache=False)
    if not latest:
        return False
    if latest.created_at is None:
        return False
    now = datetime.now(timezone.utc)
    created = latest.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    age_min = (now - created).total_seconds() / 60.0
    cooldown = min_minutes_live if game.status == "live" else min_minutes_scheduled
    return age_min < cooldown


def _predict_for_game(game: Game) -> dict[str, Any]:
    features = build_feature_dict(game)
    model_dir = _model_dir()
    out = predict_from_artifacts(model_dir, features) if model_dir else None
    if not out:
        out = heuristic_predict(features, get_settings().ml_model_version)
    exp_h, exp_a = expected_scores_for_league(game.league, float(out["home_win_probability"]))
    out["expected_home_score"] = exp_h
    out["expected_away_score"] = exp_a
    return out


def run_prediction_job(
    db: Session,
    *,
    game_ids: Optional[list[str]] = None,
    force: bool = False,
    min_minutes_scheduled: int = 45,
    min_minutes_live: int = 2,
) -> PredictionJobResult:
    """
    For live games and upcoming scheduled games (next 7 days), write a new Prediction row
    when cooldown allows. Always invalidates Redis cache for touched games.
    """
    now = datetime.now(timezone.utc)
    window_end = now + timedelta(days=7)

    q = db.query(Game)
    if game_ids:
        try:
            uids = [UUID(g) for g in game_ids]
        except ValueError:
            return PredictionJobResult(0, 0, 0, ["invalid game_ids"])
        q = q.filter(Game.id.in_(uids))
    else:
        q = q.filter(
            or_(
                Game.status == "live",
                and_(
                    Game.status == "scheduled",
                    Game.scheduled_time >= now - timedelta(hours=2),
                    Game.scheduled_time <= window_end,
                ),
            )
        )

    games = q.all()
    result = PredictionJobResult(
        games_considered=len(games),
        predictions_written=0,
        skipped_cooldown=0,
        errors=[],
    )
    ps = PredictionService(db)

    for game in games:
        try:
            if _should_skip(
                db,
                game,
                force=force,
                min_minutes_scheduled=min_minutes_scheduled,
                min_minutes_live=min_minutes_live,
            ):
                result.skipped_cooldown += 1
                continue
            payload = _predict_for_game(game)
            created_at = datetime.now(timezone.utc)
            pred = Prediction(
                id=uuid4(),
                game_id=game.id,
                model_version=str(payload["model_version"])[:50],
                home_win_probability=payload["home_win_probability"],
                away_win_probability=payload["away_win_probability"],
                expected_home_score=payload["expected_home_score"],
                expected_away_score=payload["expected_away_score"],
                confidence_level=str(payload["confidence_level"]),
                created_at=created_at,
            )
            db.add(pred)
            db.commit()
            db.refresh(pred)
            ps.invalidate_prediction_cache(str(game.id))
            result.predictions_written += 1
            logger.info(
                "prediction_job wrote game_id=%s model=%s home_win=%s",
                game.id,
                pred.model_version,
                pred.home_win_probability,
            )
        except Exception as e:
            db.rollback()
            result.errors.append(f"{game.id}: {e}")
            logger.exception("prediction_job failed for game %s", game.id)

    return result
