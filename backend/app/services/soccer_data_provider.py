"""Choose Sportradar vs ClearSports for soccer schedule/standings sync."""
from __future__ import annotations

from app.config import Settings
from app.constants.soccer import SOCCER_LEAGUE_CODES
from app.services.sportradar_soccer_service import configured_soccer_league_codes as sportradar_leagues
from app.services.clearsports_soccer_service import (
    clearsports_season_for_league,
    configured_clearsports_soccer_leagues,
)


def use_clearsports_soccer(settings: Settings) -> bool:
    cs = (settings.clearsports_api_key or "").strip()
    if not cs:
        return False
    sr = (settings.sportradar_api_key or "").strip()
    return not sr


def configured_soccer_league_codes(settings: Settings) -> list[str]:
    if use_clearsports_soccer(settings):
        return configured_clearsports_soccer_leagues(settings)
    return sportradar_leagues(settings)


def season_label_for_league(app_league: str, settings: Settings) -> str:
    if use_clearsports_soccer(settings):
        return (clearsports_season_for_league(app_league, settings) or "").strip()
    from app.services.sportradar_soccer_service import soccer_season_id_for_league

    return (soccer_season_id_for_league(app_league, settings) or "").strip()


def all_soccer_league_codes() -> tuple[str, ...]:
    return SOCCER_LEAGUE_CODES
