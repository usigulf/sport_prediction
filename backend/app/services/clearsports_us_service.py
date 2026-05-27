"""
ClearSports NFL and NBA feeds (https://clearsportsapi.com/docs).

Paths: GET /api/v1/nfl/games?season=2025
       GET /api/v1/nba/games?season=2025&date=YYYY-MM-DD
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal

from app.config import Settings
from app.services.clearsports_soccer_service import fetch_clearsports_league_games

UsLeague = Literal["nfl", "nba"]

CLEARSPORTS_US_LEAGUE_SLUG: dict[str, str] = {
    "nfl": "nfl",
    "nba": "nba",
}

US_LEAGUE_CODES: tuple[str, ...] = ("nfl", "nba")


def use_clearsports_us(settings: Settings) -> bool:
    """True when ClearSports key is set (primary provider for NFL/NBA in this project)."""
    return bool((settings.clearsports_api_key or "").strip())


def default_us_season_year(league: UsLeague, now: datetime | None = None) -> int:
    now = now or datetime.now(timezone.utc)
    y = now.year
    if league == "nba":
        return y if now.month >= 10 else y - 1
    # NFL season year: Sep–Feb spans two calendar years
    return y if now.month >= 9 else y - 1


def clearsports_us_season_for_league(league: UsLeague, settings: Settings) -> str:
    key = league
    env_map: dict[str, str | None] = {
        "nfl": getattr(settings, "clearsports_nfl_season", None),
        "nba": getattr(settings, "clearsports_nba_season", None),
    }
    sid = (env_map.get(key) or "").strip()
    if sid:
        return sid
    return str(default_us_season_year(league))


def configured_clearsports_us_leagues(settings: Settings) -> list[str]:
    if not use_clearsports_us(settings):
        return []
    return list(US_LEAGUE_CODES)


def fetch_clearsports_us_games(
    settings: Settings,
    league: UsLeague,
    *,
    season: str | None = None,
    date: str | None = None,
) -> list[dict[str, Any]]:
    slug = CLEARSPORTS_US_LEAGUE_SLUG.get(league)
    if not slug:
        return []
    return fetch_clearsports_league_games(settings, slug, season=season, date=date)


def clearsports_us_health_probe(settings: Settings) -> dict[str, Any]:
    """Probe NFL and NBA game feeds when ClearSports is configured."""
    if not use_clearsports_us(settings):
        return {
            "clearsports_us_configured": False,
            "clearsports_nfl_ok": None,
            "clearsports_nba_ok": None,
        }
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    nfl_season = clearsports_us_season_for_league("nfl", settings)
    nba_season = clearsports_us_season_for_league("nba", settings)
    nfl = fetch_clearsports_us_games(settings, "nfl", season=nfl_season, date=today)
    if not nfl:
        nfl = fetch_clearsports_us_games(settings, "nfl", season=nfl_season)
    nba = fetch_clearsports_us_games(settings, "nba", season=nba_season, date=today)
    if not nba:
        nba = fetch_clearsports_us_games(settings, "nba", season=nba_season)
    return {
        "clearsports_us_configured": True,
        "clearsports_nfl_ok": len(nfl) > 0,
        "clearsports_nba_ok": len(nba) > 0,
        "clearsports_nfl_season": nfl_season,
        "clearsports_nba_season": nba_season,
        "clearsports_nfl_sample_count": len(nfl),
        "clearsports_nba_sample_count": len(nba),
    }
