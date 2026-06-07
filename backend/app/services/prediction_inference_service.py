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
from sqlalchemy.orm import Session, joinedload

from app.config import get_settings
from app.models.game import Game
from app.models.prediction import Prediction
from app.services.feature_builder import (
    FeatureSource,
    build_game_features,
    build_rich_analysis_dict,
    expected_scores_for_league,
)
from app.constants.soccer import SOCCER_LEAGUES_SET
from app.services.ml_artifacts import (
    confidence_from_three_way,
    heuristic_predict,
    predict_from_artifacts,
    soccer_three_way_from_home_edge,
)
from app.services.live_prediction_service import tag_inplay_model_version
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


def _predict_for_game(
    game: Game, db: Session
) -> tuple[dict[str, Any], dict[str, float | int], FeatureSource]:
    features, feat_src = build_game_features(game, db)
    model_dir = _model_dir()
    out = predict_from_artifacts(model_dir, features) if model_dir else None
    if not out:
        out = heuristic_predict(features, get_settings().ml_model_version)

    # The model emits a two-way (home-vs-away) probability. Expected scores use
    # this true edge before any 1X2 reshaping.
    home_two_way = float(out["home_win_probability"])
    exp_h, exp_a = expected_scores_for_league(
        game.league,
        home_two_way,
        home_team_avg_score=float(features["home_team_avg_score"])
        if isinstance(features.get("home_team_avg_score"), (int, float))
        else None,
        away_team_avg_score=float(features["away_team_avg_score"])
        if isinstance(features.get("away_team_avg_score"), (int, float))
        else None,
    )

    # Soccer is a 3-outcome market: carve out a real draw arm so the stored
    # home/away pair sums to (1 − draw). Downstream code derives draw as
    # 1 − home − away, so this is what makes a draw pick possible at all.
    if (game.league or "").lower() in SOCCER_LEAGUES_SET:
        home_p, draw_p, away_p = soccer_three_way_from_home_edge(home_two_way)
        out["home_win_probability"] = home_p
        out["away_win_probability"] = away_p
        out["confidence_level"] = confidence_from_three_way(home_p, draw_p, away_p)

    out["expected_home_score"] = exp_h
    out["expected_away_score"] = exp_a
    return out, features, feat_src


def run_prediction_job(
    db: Session,
    *,
    game_ids: Optional[list[str]] = None,
    force: bool = False,
    min_minutes_scheduled: int = 45,
    min_minutes_live: int = 2,
    include_recent_finished_days: int = 0,
    leagues: Optional[list[str]] = None,
) -> PredictionJobResult:
    """
    For live games and upcoming scheduled games (next 7 days), write a new Prediction row
    when cooldown allows. Always invalidates Redis cache for touched games.

    include_recent_finished_days: also score finished games in the last N days (demo/backfill).
    leagues: optional filter to app league codes (e.g. premier_league only).
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
        clauses = [
            Game.status == "live",
            and_(
                Game.status == "scheduled",
                Game.scheduled_time >= now - timedelta(hours=2),
                Game.scheduled_time <= window_end,
            ),
        ]
        if include_recent_finished_days > 0:
            since = now - timedelta(days=include_recent_finished_days)
            clauses.append(
                and_(
                    Game.status == "finished",
                    Game.scheduled_time >= since,
                    Game.scheduled_time < now,
                )
            )
        q = q.filter(or_(*clauses))
    if leagues:
        allow = [lg.strip().lower() for lg in leagues if lg and lg.strip()]
        if allow:
            q = q.filter(Game.league.in_(allow))

    games = q.options(joinedload(Game.home_team), joinedload(Game.away_team)).all()
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
            payload, feat, feat_src = _predict_for_game(game, db)
            if (game.status or "").lower() == "live":
                payload["model_version"] = tag_inplay_model_version(str(payload["model_version"]))
            if feat_src == "synthetic" and "_synthetic" not in str(payload["model_version"]):
                payload["model_version"] = f"{payload['model_version']}_synthetic"[:50]
            rich = build_rich_analysis_dict(game, feat, db=db, feature_source=feat_src)
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
                rich_analysis=rich,
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
