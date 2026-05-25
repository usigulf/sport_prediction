"""Route soccer sync to ClearSports or Sportradar based on configured API keys."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.config import Settings
from app.services.soccer_data_provider import use_clearsports_soccer
from app.services.sportradar_soccer_schedule_sync import (
    SoccerScheduleSyncResult,
    sync_soccer_schedule_for_league as sync_sr_schedule,
)
from app.services.sportradar_soccer_standings_sync import (
    SoccerStandingsSyncResult,
    sync_soccer_standings_for_league as sync_sr_standings,
)


def sync_soccer_schedule_for_league(
    db: Session, app_league: str, settings: Settings
) -> SoccerScheduleSyncResult:
    if use_clearsports_soccer(settings):
        from app.services.clearsports_soccer_schedule_sync import sync_clearsports_soccer_schedule_for_league

        return sync_clearsports_soccer_schedule_for_league(db, app_league, settings)
    return sync_sr_schedule(db, app_league, settings)


def sync_soccer_standings_for_league(
    db: Session, app_league: str, settings: Settings
) -> SoccerStandingsSyncResult:
    if use_clearsports_soccer(settings):
        from app.services.clearsports_soccer_standings_sync import sync_clearsports_soccer_standings_for_league

        return sync_clearsports_soccer_standings_for_league(db, app_league, settings)
    return sync_sr_standings(db, app_league, settings)
