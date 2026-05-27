"""
ClearSports soccer feeds (https://clearsportsapi.com/docs — EPL, La Liga, etc.).

Paths: GET /api/v1/{league_slug}/games?season=2024-2025
Auth: Bearer CLEARSPORTS_API_KEY
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.config import Settings
from app.constants.soccer import SOCCER_LEAGUE_CODES
from app.services.clearsports_client import clearsports_get_json

# App league code -> ClearSports URL segment (see docs "Soccer Leagues")
CLEARSPORTS_LEAGUE_SLUG: dict[str, str] = {
    "premier_league": "epl",
    "la_liga": "la_liga",
    "serie_a": "serie_a",
    "bundesliga": "bundesliga",
    "mls": "mls",
    "champions_league": "uefa",
}


def default_soccer_season_label() -> str:
    """European-style season label (Aug–Jul)."""
    now = datetime.now(timezone.utc)
    y = now.year
    if now.month >= 8:
        return f"{y}-{y + 1}"
    return f"{y - 1}-{y}"


def clearsports_season_for_league(league: str, settings: Settings) -> str | None:
    key = (league or "").lower().strip()
    env_map: dict[str, str | None] = {
        "premier_league": settings.clearsports_soccer_season_premier_league,
        "champions_league": settings.clearsports_soccer_season_champions_league,
        "la_liga": settings.clearsports_soccer_season_la_liga,
        "serie_a": settings.clearsports_soccer_season_serie_a,
        "bundesliga": settings.clearsports_soccer_season_bundesliga,
        "mls": settings.clearsports_soccer_season_mls,
    }
    sid = (env_map.get(key) or "").strip()
    if sid:
        return sid
    if key in CLEARSPORTS_LEAGUE_SLUG:
        return default_soccer_season_label()
    return None


def configured_clearsports_soccer_leagues(settings: Settings) -> list[str]:
    if not (settings.clearsports_api_key or "").strip():
        return []
    out: list[str] = []
    for code in SOCCER_LEAGUE_CODES:
        if code in CLEARSPORTS_LEAGUE_SLUG and clearsports_season_for_league(code, settings):
            out.append(code)
    return out


def clearsports_league_slug(app_league: str) -> str | None:
    return CLEARSPORTS_LEAGUE_SLUG.get((app_league or "").lower().strip())


def _games_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("games", "data", "results", "items"):
        v = payload.get(key)
        if isinstance(v, list):
            return [x for x in v if isinstance(x, dict)]
    return []


def fetch_clearsports_league_games(
    settings: Settings,
    slug: str,
    *,
    season: str | None = None,
    date: str | None = None,
) -> list[dict[str, Any]]:
    """GET /v1/{slug}/games — used for soccer (epl, la_liga, …) and US sports (nfl, nba)."""
    slug = (slug or "").strip().lower()
    if not slug:
        return []
    key = (settings.clearsports_api_key or "").strip()
    base = (settings.clearsports_api_base_url or "").strip()
    if not key:
        return []
    query: dict[str, str] = {}
    if season:
        query["season"] = season.strip()
    if date:
        query["date"] = date.strip()
    path = f"/v1/{slug}/games"
    data, code, _err = clearsports_get_json(base, key, path, query or None)
    if data is None or code != 200:
        return []
    return _games_list(data)


def fetch_clearsports_games(
    settings: Settings,
    app_league: str,
    *,
    season: str | None = None,
    date: str | None = None,
) -> list[dict[str, Any]]:
    slug = clearsports_league_slug(app_league)
    if not slug:
        return []
    return fetch_clearsports_league_games(settings, slug, season=season, date=date)


def _norm_name(s: str) -> str:
    return (s or "").casefold().strip()


def find_clearsports_team_stats_row(
    rows: list[dict[str, Any]], abbreviation: str | None, team_name: str
) -> dict[str, Any] | None:
    ab = (abbreviation or "").strip().upper()
    nm = _norm_name(team_name)
    for row in rows:
        team = row.get("team") if isinstance(row.get("team"), dict) else {}
        tab = (team.get("abbreviation") or team.get("abbr") or row.get("abbreviation") or "").strip().upper()
        if ab and tab == ab:
            return row
    for row in rows:
        team = row.get("team") if isinstance(row.get("team"), dict) else {}
        cn = _norm_name(team.get("name") or team.get("team_name") or row.get("team_name") or row.get("name") or "")
        if cn and nm and (cn in nm or nm in cn or cn == nm):
            return row
    return None


def fetch_clearsports_team_stats(settings: Settings, app_league: str) -> list[dict[str, Any]]:
    slug = clearsports_league_slug(app_league)
    if not slug:
        return []
    key = (settings.clearsports_api_key or "").strip()
    base = (settings.clearsports_api_base_url or "").strip()
    if not key:
        return []
    path = f"/v1/{slug}/team-stats"
    data, code, _err = clearsports_get_json(base, key, path)
    if data is None or code != 200:
        return []
    return _games_list(data)


def clearsports_soccer_health_probe(settings: Settings) -> dict[str, Any]:
    """Probe Premier League games for configured season (soccer beta default)."""
    key = (settings.clearsports_api_key or "").strip()
    if not key:
        return {
            "clearsports_soccer_configured": False,
            "clearsports_soccer_ok": False,
            "detail": "CLEARSPORTS_API_KEY not set",
        }
    season = clearsports_season_for_league("premier_league", settings) or default_soccer_season_label()
    games = fetch_clearsports_games(settings, "premier_league", season=season)
    return {
        "clearsports_soccer_configured": True,
        "clearsports_soccer_ok": len(games) > 0,
        "premier_league_season": season,
        "premier_league_games_count": len(games),
        "configured_leagues": configured_clearsports_soccer_leagues(settings),
        "provider": "clearsports",
    }
