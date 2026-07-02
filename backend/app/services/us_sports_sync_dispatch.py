"""Route NFL/NBA schedule sync to ClearSports (primary) or legacy Sportradar."""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.config import Settings
from app.services.clearsports_us_service import use_clearsports_us


def sync_us_schedule_for_league(db: Session, league: str, settings: Settings) -> Any:
    """Sync a single US league (nfl or nba) via ClearSports or Sportradar."""
    lg = (league or "").strip().lower()
    if lg not in ("nfl", "nba"):
        raise ValueError(f"unsupported US league: {league}")
    if use_clearsports_us(settings):
        from app.services.clearsports_us_schedule_sync import sync_clearsports_us_schedule_for_league

        return sync_clearsports_us_schedule_for_league(db, lg, settings)
    from app.services.sportradar_us_schedule_sync import sync_us_schedule

    return sync_us_schedule(db, lg, settings)


def sync_all_us_schedules(db: Session, settings: Settings) -> list[Any]:
    if use_clearsports_us(settings):
        from app.services.clearsports_us_schedule_sync import sync_all_clearsports_us_schedules

        return sync_all_clearsports_us_schedules(db, settings)
    from app.services.sportradar_us_schedule_sync import sync_all_us_schedules as sync_sportradar

    return sync_sportradar(db, settings)


def us_sync_result_payload(r: Any) -> dict[str, Any]:
    """Normalize ClearSports SoccerScheduleSyncResult and Sportradar UsScheduleSyncResult."""
    league = getattr(r, "league", None) or getattr(r, "app_league", None)
    season_id = getattr(r, "season_id", None)
    season_year = getattr(r, "season_year", None)
    if season_year is None and season_id is not None:
        try:
            season_year = int(str(season_id)[:4])
        except (TypeError, ValueError):
            season_year = season_id
    provider = "clearsports" if hasattr(r, "app_league") else "sportradar"
    return {
        "league": league,
        "provider": provider,
        "season_year": season_year,
        "season_type": getattr(r, "season_type", "REG"),
        "rows_fetched": getattr(r, "rows_fetched", 0),
        "games_upserted": getattr(r, "games_upserted", 0),
        "rows_skipped": getattr(r, "rows_skipped", 0),
        "errors": list(getattr(r, "errors", []) or []),
    }
