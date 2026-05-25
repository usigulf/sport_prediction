"""
Default HTTPS logo URLs for teams when DB `logo_url` is empty.

NFL/NBA: ESPN CDN by abbreviation (lowercase filename).
Soccer: ESPN soccer logo ids per (league, abbreviation) — see `_build_soccer_map`.

`team_to_api_dict` attaches these URLs at JSON serialization time so clients always receive a usable
`logo_url` even when the DB row is NULL or still has a placeholder.

Logos are third-party assets; ensure your use complies with ESPN/CDN and league terms.
"""
from __future__ import annotations

from typing import Any

# English Premier League — ESPN team ids (site.api.espn.com …/soccer/eng.1/teams)
_PL_ENG: dict[str, int] = {
    "BOU": 349,
    "ARS": 359,
    "AVL": 362,
    "BRE": 337,
    "BHA": 331,
    "BUR": 379,
    "CHE": 363,
    "CRY": 384,
    "EVE": 368,
    "FUL": 370,
    "LEE": 357,
    "LIV": 364,
    "MNC": 382,
    "MAN": 360,
    "NEW": 361,
    "NFO": 393,
    "SUN": 366,
    "TOT": 367,
    "WHU": 371,
    "WOL": 380,
}

# Provider abbreviations that differ from ESPN’s (same numeric crest id)
_PL_ALIASES: dict[str, str] = {
    "MCI": "MNC",
    "MUN": "MAN",
}


def _build_soccer_map() -> dict[tuple[str, str], int]:
    """Premier League + CL entries + other leagues; CL duplicates PL ids for English clubs."""
    m: dict[tuple[str, str], int] = {
        ("champions_league", "RMA"): 86,
        ("champions_league", "BAR"): 83,
        ("champions_league", "BAY"): 132,
        ("champions_league", "PSG"): 160,
        ("champions_league", "INT"): 110,
        ("la_liga", "ATM"): 1068,
        ("la_liga", "SEV"): 243,
        ("la_liga", "RSO"): 278,
        ("la_liga", "VIL"): 102,
        ("la_liga", "ATH"): 93,
        ("la_liga", "BET"): 244,
        ("serie_a", "JUV"): 111,
        ("serie_a", "MIL"): 103,
        ("serie_a", "NAP"): 114,
        ("serie_a", "ROM"): 104,
        ("serie_a", "LAZ"): 115,
        ("serie_a", "FIO"): 322,
        ("bundesliga", "BVB"): 124,
        ("bundesliga", "RBL"): 175,
        ("bundesliga", "B04"): 131,
        ("bundesliga", "SGE"): 125,
        ("bundesliga", "VFB"): 134,
        ("bundesliga", "WOB"): 138,
        ("mls", "LAFC"): 18269,
        ("mls", "MIA"): 19300,
        ("mls", "CLB"): 183,
        ("mls", "SEA"): 819,
        ("mls", "ATL"): 18418,
        ("mls", "NYC"): 176,
    }
    for ab, sid in _PL_ENG.items():
        m[("premier_league", ab)] = sid
        m[("champions_league", ab)] = sid
    for alias, canon in _PL_ALIASES.items():
        sid = _PL_ENG[canon]
        m[("premier_league", alias)] = sid
        m[("champions_league", alias)] = sid
    return m


SOCCER_ESPN_IDS: dict[tuple[str, str], int] = _build_soccer_map()


def _nfl_espn_logo_segment(abbreviation: str) -> str:
    """ESPN CDN path segment for NFL (e.g. Commanders file is wsh.png, not was.png)."""
    ab = abbreviation.strip().upper()
    if ab == "WAS":
        return "wsh"
    return ab.lower()


def default_team_logo_url(league: str, abbreviation: str | None) -> str | None:
    """Return a default logo URL from league + abbreviation, or None if unknown."""
    lg = (league or "").strip().lower()
    ab = (abbreviation or "").strip().upper()
    if not ab:
        return None
    if lg == "nfl":
        seg = _nfl_espn_logo_segment(ab)
        return f"https://a.espncdn.com/i/teamlogos/nfl/500/{seg}.png"
    if lg == "nba":
        return f"https://a.espncdn.com/i/teamlogos/nba/500/{ab.lower()}.png"
    key = (lg, ab)
    sid = SOCCER_ESPN_IDS.get(key)
    if sid is not None:
        return f"https://a.espncdn.com/i/teamlogos/soccer/500/{sid}.png"
    return None


def team_to_api_dict(team: Any) -> dict[str, Any] | None:
    """Serialize Team ORM row for API JSON; fill `logo_url` when missing or placeholder."""
    if team is None:
        return None
    from app.schemas.game import TeamResponse

    d = TeamResponse.model_validate(team).model_dump()
    raw = (d.get("logo_url") or "").strip()
    if not raw or raw.startswith("https://example.com"):
        fb = default_team_logo_url(str(d.get("league") or ""), d.get("abbreviation"))
        if fb:
            d["logo_url"] = fb
    return d
