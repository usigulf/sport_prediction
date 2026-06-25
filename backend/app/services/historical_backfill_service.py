"""
M-07: Ingest prior seasons of finished games for training and backtest.

Uses ClearSports season feeds when configured; otherwise Sportradar for NFL/NBA.
Soccer historical seasons require ClearSports (Sportradar needs per-season UUID in env).
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal

from sqlalchemy.orm import Session

from app.config import Settings
from app.models.game import Game
from app.services.clearsports_us_service import (
    UsLeague,
    default_us_season_year,
    use_clearsports_us,
)
from app.services.soccer_data_provider import configured_soccer_league_codes, use_clearsports_soccer

logger = logging.getLogger(__name__)

UsLeagueCode = Literal["nfl", "nba"]


@dataclass
class SeasonSyncSummary:
    league: str
    season: str
    provider: str
    rows_fetched: int = 0
    games_upserted: int = 0
    rows_skipped: int = 0
    errors: list[str] = field(default_factory=list)


@dataclass
class HistoricalBackfillResult:
    seasons_back: int
    season_syncs: list[SeasonSyncSummary] = field(default_factory=list)
    decisive_counts: dict[str, int] = field(default_factory=dict)
    min_decisive_target: int = 500
    leagues_at_target: list[str] = field(default_factory=list)
    leagues_below_target: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def soccer_season_labels(seasons_back: int, *, now: datetime | None = None) -> list[str]:
    """European-style labels: 2024-2025, 2023-2024, …"""
    now = now or datetime.now(timezone.utc)
    y = now.year
    start = y if now.month >= 8 else y - 1
    n = max(1, seasons_back + 1)
    return [f"{start - i}-{start - i + 1}" for i in range(n)]


def us_season_years(league: UsLeague, seasons_back: int, *, now: datetime | None = None) -> list[str]:
    current = default_us_season_year(league, now)
    n = max(1, seasons_back + 1)
    return [str(current - i) for i in range(n)]


def count_decisive_finished_games(db: Session, league: str | None = None) -> int:
    """Finished games with a winner (excludes draws) — matches model_training corpus."""
    q = (
        db.query(Game)
        .filter(Game.status.in_(["finished", "final"]))
        .filter(Game.home_team_id.isnot(None), Game.away_team_id.isnot(None))
        .filter(Game.home_score.isnot(None), Game.away_score.isnot(None))
        .filter(Game.home_score != Game.away_score)
    )
    if league:
        q = q.filter(Game.league == league.strip().lower())
    return q.count()


def decisive_counts_by_league(db: Session, leagues: list[str]) -> dict[str, int]:
    return {lg: count_decisive_finished_games(db, lg) for lg in leagues}


def _sync_us_season(
    db: Session, league: UsLeagueCode, season: str, settings: Settings
) -> SeasonSyncSummary:
    if use_clearsports_us(settings):
        from app.services.clearsports_us_schedule_sync import sync_clearsports_us_schedule_for_league

        r = sync_clearsports_us_schedule_for_league(
            db, league, settings, season=season, include_today=False
        )
        return SeasonSyncSummary(
            league=league,
            season=season,
            provider="clearsports",
            rows_fetched=r.rows_fetched,
            games_upserted=r.games_upserted,
            rows_skipped=r.rows_skipped,
            errors=list(r.errors),
        )

    from app.services.sportradar_us_schedule_sync import sync_us_schedule

    try:
        year = int(season)
    except ValueError:
        return SeasonSyncSummary(
            league=league,
            season=season,
            provider="sportradar",
            errors=[f"invalid season year: {season}"],
        )
    r = sync_us_schedule(db, league, settings, season_year=year)
    return SeasonSyncSummary(
        league=league,
        season=season,
        provider="sportradar",
        rows_fetched=r.rows_fetched,
        games_upserted=r.games_upserted,
        rows_skipped=r.rows_skipped,
        errors=list(r.errors),
    )


def _sync_soccer_season(
    db: Session, app_league: str, season: str, settings: Settings
) -> SeasonSyncSummary:
    if not use_clearsports_soccer(settings):
        return SeasonSyncSummary(
            league=app_league,
            season=season,
            provider="sportradar",
            errors=["historical soccer backfill requires CLEARSPORTS_API_KEY (Sportradar needs per-season UUID in env)"],
        )
    from app.services.clearsports_soccer_schedule_sync import sync_clearsports_soccer_schedule_for_league

    r = sync_clearsports_soccer_schedule_for_league(
        db, app_league, settings, season=season, include_today=False
    )
    return SeasonSyncSummary(
        league=app_league,
        season=season,
        provider="clearsports",
        rows_fetched=r.rows_fetched,
        games_upserted=r.games_upserted,
        rows_skipped=r.rows_skipped,
        errors=list(r.errors),
    )


def _leagues_to_backfill(settings: Settings, leagues: list[str] | None) -> list[str]:
    if leagues:
        return [lg.strip().lower() for lg in leagues if lg and lg.strip()]
    out: list[str] = []
    if use_clearsports_us(settings) or (settings.sportradar_api_key or "").strip():
        out.extend(["nfl", "nba"])
    out.extend(configured_soccer_league_codes(settings))
    # Preserve order, dedupe
    seen: set[str] = set()
    ordered: list[str] = []
    for lg in out:
        if lg not in seen:
            seen.add(lg)
            ordered.append(lg)
    return ordered


def run_historical_backfill(
    db: Session,
    settings: Settings,
    *,
    seasons_back: int = 2,
    leagues: list[str] | None = None,
    min_decisive_target: int = 500,
) -> HistoricalBackfillResult:
    """
    Sync prior seasons for configured leagues, then report decisive finished game counts.
    Idempotent: upserts by external sport_event id.
    """
    out = HistoricalBackfillResult(
        seasons_back=max(1, seasons_back),
        min_decisive_target=min_decisive_target,
    )
    target_leagues = _leagues_to_backfill(settings, leagues)
    if not target_leagues:
        out.errors.append("no leagues configured for backfill (set CLEARSPORTS_API_KEY or SPORTRADAR_API_KEY)")
        return out

    us_set = {"nfl", "nba"}
    for lg in target_leagues:
        if lg in us_set:
            for season in us_season_years(lg, out.seasons_back):  # type: ignore[arg-type]
                summary = _sync_us_season(db, lg, season, settings)  # type: ignore[arg-type]
                out.season_syncs.append(summary)
                if summary.errors:
                    logger.warning("historical backfill %s %s: %s", lg, season, summary.errors)
        else:
            for season in soccer_season_labels(out.seasons_back):
                summary = _sync_soccer_season(db, lg, season, settings)
                out.season_syncs.append(summary)
                if summary.errors:
                    logger.warning("historical backfill %s %s: %s", lg, season, summary.errors)

    out.decisive_counts = decisive_counts_by_league(db, target_leagues)
    for lg, count in out.decisive_counts.items():
        if count >= min_decisive_target:
            out.leagues_at_target.append(lg)
        else:
            out.leagues_below_target.append(lg)

    return out


def backfill_result_payload(result: HistoricalBackfillResult) -> dict[str, Any]:
    return {
        "seasons_back": result.seasons_back,
        "min_decisive_target": result.min_decisive_target,
        "decisive_counts": result.decisive_counts,
        "leagues_at_target": result.leagues_at_target,
        "leagues_below_target": result.leagues_below_target,
        "season_syncs": [
            {
                "league": s.league,
                "season": s.season,
                "provider": s.provider,
                "rows_fetched": s.rows_fetched,
                "games_upserted": s.games_upserted,
                "rows_skipped": s.rows_skipped,
                "errors": s.errors,
            }
            for s in result.season_syncs
        ],
        "errors": result.errors,
    }
