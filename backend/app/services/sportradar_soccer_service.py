"""
Soccer season standings from Sportradar Global Soccer API v4.

Path: /soccer/{trial|production}/v4/en/seasons/{season_id}/standings.json
Requires SPORTRADAR_API_KEY, access level, and a season id per competition (from Seasons API).

See: https://developer.sportradar.com/soccer/reference/soccer-season-standings
"""
from __future__ import annotations

import json
import logging
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from app.config import Settings

logger = logging.getLogger(__name__)

_CACHE: dict[str, tuple[float, dict[str, Any] | None, str | None]] = {}
_SUCCESS_TTL_SEC = 300.0
_ERROR_TTL_SEC = 45.0


def _access_level(settings: Settings) -> str:
    access = (settings.sportradar_access_level or "trial").lower()
    return access if access in ("trial", "production") else "trial"


def soccer_season_id_for_league(league: str, settings: Settings) -> str | None:
    """Return Sportradar season id (e.g. sr:season:130281) when configured for this app league code."""
    key = (league or "").lower().strip()
    if key == "premier_league":
        sid = (settings.sportradar_soccer_season_premier_league or "").strip()
        return sid or None
    if key == "champions_league":
        sid = (settings.sportradar_soccer_season_champions_league or "").strip()
        return sid or None
    return None


def _cache_key(settings: Settings, season_id: str) -> str:
    return f"{_access_level(settings)}:{season_id}"


def _fetch_standings(base: str, access: str, season_id: str, api_key: str) -> dict[str, Any] | None:
    enc = urllib.parse.quote(season_id, safe="")
    path = f"/soccer/{access}/v4/en/seasons/{enc}/standings.json"
    url = base.rstrip("/") + path
    req = urllib.request.Request(url, headers={"x-api-key": api_key})
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = resp.read().decode()
            return json.loads(raw)
    except urllib.error.HTTPError as e:
        logger.debug("Sportradar soccer standings HTTP %s for season %s", e.code, season_id)
        return None
    except Exception as e:
        logger.debug("Sportradar soccer fetch failed: %s", e)
        return None


def fetch_soccer_standings_json(
    settings: Settings, season_id: str
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Return (standings_json, label) for the given Sportradar season id.
    Cached ~5m on success; failures ~45s.
    """
    key = (getattr(settings, "sportradar_api_key", "") or "").strip()
    if not key or not (season_id or "").strip():
        return None, None

    sid = season_id.strip()
    ck = _cache_key(settings, sid)
    now = time.monotonic()
    if ck in _CACHE:
        expires_at, payload, label = _CACHE[ck]
        if now < expires_at:
            return payload, label

    access = _access_level(settings)
    base = settings.sportradar_api_url.rstrip("/")
    data = _fetch_standings(base, access, sid, key)
    label = sid
    if data:
        _CACHE[ck] = (now + _SUCCESS_TTL_SEC, data, label)
        return data, label
    _CACHE[ck] = (now + _ERROR_TTL_SEC, None, None)
    return None, None


def flatten_soccer_standings_rows(data: dict[str, Any]) -> list[dict[str, Any]]:
    """Collect row dicts from standings blocks; prefer type=total tables."""
    blocks = data.get("standings") or []
    if not isinstance(blocks, list):
        return []
    total_blocks = [b for b in blocks if isinstance(b, dict) and b.get("type") == "total"]
    use = total_blocks if total_blocks else [b for b in blocks if isinstance(b, dict)]
    out: list[dict[str, Any]] = []
    for block in use:
        for grp in block.get("groups") or []:
            if not isinstance(grp, dict):
                continue
            for row in grp.get("standings") or []:
                if isinstance(row, dict):
                    out.append(row)
    return out


def _norm_name(s: str) -> str:
    return (s or "").casefold().strip()


def find_soccer_standing_row(
    rows: list[dict[str, Any]], abbreviation: str | None, team_name: str
) -> dict[str, Any] | None:
    ab = (abbreviation or "").strip().upper()
    nm = _norm_name(team_name)
    for row in rows:
        comp = row.get("competitor") if isinstance(row.get("competitor"), dict) else {}
        if ab and (comp.get("abbreviation") or "").strip().upper() == ab:
            return row
    for row in rows:
        comp = row.get("competitor") if isinstance(row.get("competitor"), dict) else {}
        cn = _norm_name(comp.get("name") or "")
        if cn and nm and (cn in nm or nm in cn or cn == nm):
            return row
    return None


def format_soccer_standings_line(row: dict[str, Any]) -> str:
    comp = row.get("competitor") if isinstance(row.get("competitor"), dict) else {}
    ab = comp.get("abbreviation") or "?"
    w, d, l = row.get("win"), row.get("draw"), row.get("loss")
    rec = ""
    if w is not None and d is not None and l is not None:
        rec = f"{w}-{d}-{l}"
    rk = row.get("rank")
    pts = row.get("points")
    gf, ga = row.get("goals_for"), row.get("goals_against")
    gd = row.get("goals_diff")
    bits: list[str] = []
    if rec:
        bits.append(f"{ab} {rec}")
    else:
        bits.append(str(ab))
    if rk is not None:
        bits.append(f"#{rk}")
    if pts is not None:
        bits.append(f"{pts} pts")
    if gf is not None and ga is not None:
        bits.append(f"{gf}-{ga} GF-GA")
    if gd is not None:
        bits.append(f"GD {gd}")
    form = comp.get("form")
    if form:
        bits.append(f"form {form}")
    return " ".join(bits)


def soccer_matchup_provider_note(game, settings: Settings) -> str | None:
    """Sportradar soccer table snapshot for home/away when league + season id are configured."""
    league = (game.league or "").lower()
    season_id = soccer_season_id_for_league(league, settings)
    if not season_id:
        return None
    home = getattr(game, "home_team", None)
    away = getattr(game, "away_team", None)
    if not home or not away:
        return None

    data, _ = fetch_soccer_standings_json(settings, season_id)
    if not data:
        return None

    rows = flatten_soccer_standings_rows(data)
    if not rows:
        return None

    th = find_soccer_standing_row(rows, home.abbreviation, home.name)
    ta = find_soccer_standing_row(rows, away.abbreviation, away.name)
    if not th and not ta:
        return None

    lines = [
        f"Sportradar soccer standings (season {season_id}, live provider snapshot):",
    ]
    if th:
        lines.append(f"• {home.name}: {format_soccer_standings_line(th)}")
    if ta:
        lines.append(f"• {away.name}: {format_soccer_standings_line(ta)}")
    lines.append("Complements your internal league table; subject to Sportradar TTL.")
    return "\n".join(lines)


def soccer_health_probe(settings: Settings) -> dict[str, Any]:
    """
    Ops helper: try configured competition season ids until one standings payload succeeds.
    """
    probes: list[tuple[str, str]] = []
    pl = (settings.sportradar_soccer_season_premier_league or "").strip()
    if pl:
        probes.append(("premier_league", pl))
    cl = (settings.sportradar_soccer_season_champions_league or "").strip()
    if cl:
        probes.append(("champions_league", cl))
    if not probes:
        return {
            "soccer_configured": False,
            "soccer_standings_ok": None,
            "soccer_probe": None,
        }
    for comp, sid in probes:
        data, label = fetch_soccer_standings_json(settings, sid)
        if data is not None:
            return {
                "soccer_configured": True,
                "soccer_standings_ok": True,
                "soccer_probe": f"{comp}:{label or sid}",
            }
    return {
        "soccer_configured": True,
        "soccer_standings_ok": False,
        "soccer_probe": f"{probes[0][0]}:{probes[0][1]}",
    }
