"""
High-frequency live pipeline: refresh scores for in-progress games, then re-run ML.

Called from POST /internal/live/sync-run (cron every 1–2 min when matches are live).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.services.prediction_inference_service import run_prediction_job
from app.services.soccer_sync_dispatch import sync_soccer_schedule_for_league
from app.services.us_sports_sync_dispatch import sync_us_schedule_for_league

logger = logging.getLogger(__name__)

US_LEAGUES = frozenset({"nfl", "nba"})


@dataclass
class LiveSyncResult:
    live_games: int = 0
    leagues_synced: list[str] = field(default_factory=list)
    schedule_sync: list[dict[str, Any]] = field(default_factory=list)
    predictions_written: int = 0
    skipped_cooldown: int = 0
    prediction_errors: list[str] = field(default_factory=list)


def _schedule_sync_payload(league: str, result: Any) -> dict[str, Any]:
    return {
        "league": league,
        "rows_fetched": getattr(result, "rows_fetched", 0),
        "games_upserted": getattr(result, "games_upserted", 0),
        "rows_skipped": getattr(result, "rows_skipped", 0),
        "errors": list(getattr(result, "errors", []) or []),
    }


def run_live_sync_pipeline(
    db: Session,
    settings: Settings | None = None,
    *,
    min_minutes_live: int = 1,
) -> LiveSyncResult:
    """
    When any game is live: sync schedules/scores for those leagues, then refresh predictions.
    No-op quickly when nothing is live.
    """
    settings = settings or get_settings()
    out = LiveSyncResult()

    live_games = db.query(Game).filter(Game.status == "live").all()
    out.live_games = len(live_games)
    if not live_games:
        return out

    leagues = {(g.league or "").lower() for g in live_games if g.league}
    soccer_leagues = sorted(leagues & SOCCER_LEAGUES_SET)
    us_leagues = sorted(leagues & US_LEAGUES)
    out.leagues_synced = soccer_leagues + us_leagues

    for lg in soccer_leagues:
        try:
            r = sync_soccer_schedule_for_league(db, lg, settings)
            out.schedule_sync.append(_schedule_sync_payload(lg, r))
        except Exception as e:
            logger.exception("live sync soccer failed league=%s", lg)
            out.schedule_sync.append({"league": lg, "errors": [str(e)]})

    for lg in us_leagues:
        try:
            r = sync_us_schedule_for_league(db, lg, settings)
            out.schedule_sync.append(_schedule_sync_payload(lg, r))
        except Exception as e:
            logger.exception("live sync us failed league=%s", lg)
            out.schedule_sync.append({"league": lg, "errors": [str(e)]})

    pred = run_prediction_job(
        db,
        game_ids=[str(g.id) for g in live_games],
        force=False,
        min_minutes_live=min_minutes_live,
    )
    out.predictions_written = pred.predictions_written
    out.skipped_cooldown = pred.skipped_cooldown
    out.prediction_errors = list(pred.errors)
    return out
