"""
Upsert NFL and NBA games from ClearSports /v1/{nfl|nba}/games feeds.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.services.clearsports_us_service import (
    CLEARSPORTS_US_LEAGUE_SLUG,
    UsLeague,
    clearsports_us_season_for_league,
    fetch_clearsports_us_games,
)
from app.services.clearsports_soccer_schedule_sync import (
    SoccerScheduleSyncResult,
    _game_external_id,
    _upsert_game_clearsports,
    normalize_clearsports_game,
)
from app.services.sportradar_soccer_schedule_sync import get_or_create_team

logger = logging.getLogger(__name__)


def sync_clearsports_us_schedule_for_league(
    db: Session,
    league: UsLeague,
    settings: Settings,
    *,
    season: str | None = None,
    include_today: bool = True,
) -> SoccerScheduleSyncResult:
    slug = CLEARSPORTS_US_LEAGUE_SLUG[league]
    season = (season or clearsports_us_season_for_league(league, settings)).strip()
    out = SoccerScheduleSyncResult(app_league=league, season_id=season)
    if not (settings.clearsports_api_key or "").strip():
        out.errors.append("CLEARSPORTS_API_KEY not set")
        return out

    seen: set[str] = set()
    rows: list[dict[str, Any]] = []
    batches: list[list[dict[str, Any]]] = [fetch_clearsports_us_games(settings, league, season=season)]
    if include_today:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        batches.append(fetch_clearsports_us_games(settings, league, season=season, date=today))
    for batch in batches:
        for g in batch:
            eid = _game_external_id(g)
            if not eid or eid in seen:
                continue
            seen.add(eid)
            rows.append(g)
    out.rows_fetched = len(rows)

    for raw in rows:
        fixture = normalize_clearsports_game(raw, slug)
        if not fixture:
            out.rows_skipped += 1
            continue
        try:
            ht = get_or_create_team(db, league, fixture["home"])
            at = get_or_create_team(db, league, fixture["away"])
            _upsert_game_clearsports(db, league, ht, at, fixture)
            out.games_upserted += 1
        except Exception as e:
            logger.exception("clearsports us sync failed league=%s id=%s", league, fixture.get("sport_event_id"))
            out.errors.append(f"{fixture.get('sport_event_id')}: {e}")

    try:
        db.commit()
    except Exception as e:
        db.rollback()
        out.errors.append(f"commit failed: {e}")
        logger.exception("clearsports us sync commit failed league=%s", league)

    return out


def sync_all_clearsports_us_schedules(db: Session, settings: Settings) -> list[SoccerScheduleSyncResult]:
    return [sync_clearsports_us_schedule_for_league(db, lg, settings) for lg in ("nfl", "nba")]
