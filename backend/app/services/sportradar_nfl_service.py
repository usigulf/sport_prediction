"""
Optional NFL standings enrichment from Sportradar (v7 postgame standings).

Requires SPORTRADAR_API_KEY and correct access level (trial vs production).
See: https://developer.sportradar.com/football/reference/nfl-postgame-standings

Fetch order: REG (season year) → PRE (same year) → REG (year − 1). Successful responses
are cached ~5 minutes; failures ~45 seconds so retries are not blocked for long.
"""
from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from typing import Any

from app.config import Settings

logger = logging.getLogger(__name__)

_CACHE: dict[str, tuple[float, dict[str, Any] | None, str | None]] = {}
_SUCCESS_TTL_SEC = 300.0
_ERROR_TTL_SEC = 45.0


def _season_year(settings: Settings) -> int:
    if settings.sportradar_nfl_season_year is not None:
        return int(settings.sportradar_nfl_season_year)
    return datetime.now(timezone.utc).year


def _cache_key(settings: Settings) -> str:
    return f"{settings.sportradar_access_level}:{_season_year(settings)}"


def _access_level(settings: Settings) -> str:
    access = (settings.sportradar_access_level or "trial").lower()
    return access if access in ("trial", "production") else "trial"


def _fetch_season_standings(
    base: str, access: str, year: int, season_type: str, api_key: str
) -> dict[str, Any] | None:
    path = f"/nfl/official/{access}/v7/en/seasons/{year}/{season_type}/standings/season.json"
    url = base + path
    req = urllib.request.Request(url, headers={"x-api-key": api_key})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read().decode()
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        if e.code != 404:
            logger.debug("Sportradar NFL %s/%s HTTP %s", year, season_type, e.code)
        return None
    except Exception as e:
        logger.debug("Sportradar NFL fetch failed: %s", e)
        return None


def fetch_nfl_standings_json(settings: Settings) -> tuple[dict[str, Any] | None, str | None]:
    """
    Return (standings_json, display_label) e.g. ("REG 2025",).
    Tries REG → PRE for configured year, then REG for previous year.
    """
    key = getattr(settings, "sportradar_api_key", "") or ""
    if not key.strip():
        return None, None

    ck = _cache_key(settings)
    now = time.monotonic()
    if ck in _CACHE:
        expires_at, payload, label = _CACHE[ck]
        if now < expires_at:
            return payload, label

    access = _access_level(settings)
    base = settings.sportradar_api_url.rstrip("/")
    year = _season_year(settings)
    api_key = key.strip()

    attempts: list[tuple[int, str, str]] = [
        (year, "REG", f"REG {year}"),
        (year, "PRE", f"PRE {year}"),
        (year - 1, "REG", f"REG {year - 1}"),
    ]

    for y, season_type, label in attempts:
        data = _fetch_season_standings(base, access, y, season_type, api_key)
        if data:
            _CACHE[ck] = (now + _SUCCESS_TTL_SEC, data, label)
            return data, label

    _CACHE[ck] = (now + _ERROR_TTL_SEC, None, None)
    return None, None


def fetch_nfl_reg_standings_json(settings: Settings) -> dict[str, Any] | None:
    """Backward-compatible: JSON only (used by tests / callers that ignore season label)."""
    data, _ = fetch_nfl_standings_json(settings)
    return data


def iter_standings_teams(data: dict[str, Any]):
    for conf in data.get("conferences") or []:
        if not isinstance(conf, dict):
            continue
        for div in conf.get("divisions") or []:
            if not isinstance(div, dict):
                continue
            for team in div.get("teams") or []:
                if isinstance(team, dict):
                    yield team


def find_team_by_alias(data: dict[str, Any], abbreviation: str) -> dict[str, Any] | None:
    ab = (abbreviation or "").strip().upper()
    if not ab:
        return None
    for team in iter_standings_teams(data):
        if (team.get("alias") or "").upper() == ab:
            return team
    return None


def format_team_standings_line(team: dict[str, Any]) -> str:
    ab = team.get("alias", "?")
    w, l = team.get("wins"), team.get("losses")
    t = team.get("ties") or 0
    rec = f"{w}-{l}" + (f"-{t}" if t else "")
    rk = team.get("rank") or {}
    dr, cr = rk.get("division"), rk.get("conference")
    bits: list[str] = [f"{ab} {rec}"]
    rank_bits = []
    if dr is not None:
        rank_bits.append(f"div #{dr}")
    if cr is not None:
        rank_bits.append(f"conf #{cr}")
    if rank_bits:
        bits.append("(" + ", ".join(rank_bits) + ")")
    pf, pa = team.get("points_for"), team.get("points_against")
    if pf is not None and pa is not None:
        bits.append(f"PF/PA {pf}-{pa}")
    st = (team.get("streak") or {}).get("desc")
    if st:
        bits.append(str(st))
    return " ".join(bits)


def nfl_matchup_provider_note(game, settings: Settings) -> str | None:
    """Short Sportradar snapshot for home/away NFL teams; None if unavailable."""
    if (game.league or "").lower() != "nfl":
        return None
    home = getattr(game, "home_team", None)
    away = getattr(game, "away_team", None)
    if not home or not away:
        return None

    data, kind_label = fetch_nfl_standings_json(settings)
    if not data or not kind_label:
        return None

    th = find_team_by_alias(data, home.abbreviation)
    ta = find_team_by_alias(data, away.abbreviation)
    if not th and not ta:
        return None

    lines = [
        f"Sportradar NFL {kind_label} standings (live provider snapshot):",
    ]
    if th:
        lines.append(f"• {home.name}: {format_team_standings_line(th)}")
    if ta:
        lines.append(f"• {away.name}: {format_team_standings_line(ta)}")
    lines.append("Complements your internal league table; subject to Sportradar TTL.")
    return "\n".join(lines)
