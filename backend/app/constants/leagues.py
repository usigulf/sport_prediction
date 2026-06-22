"""
League codes and labels for filters, favorites, and API.
Focused product scope: NFL, NBA, and soccer competitions.
"""
ALLOWED_LEAGUE_CODES = {
    "nfl",
    "nba",
    "premier_league",
    "champions_league",
    "la_liga",
    "serie_a",
    "bundesliga",
    "mls",
}

# Stats / methodology — keep aligned with mobile `PRODUCT_SCOPE_LONG_DESCRIPTION`.
PRODUCT_SCOPE_SUMMARY = (
    "Coverage spans major professional football, basketball, and soccer competitions worldwide."
)

# GET /games/leagues: id + display label (navigation / data organization)
LEAGUES_LIST = [
    {"id": "nfl", "label": "NFL"},
    {"id": "nba", "label": "NBA"},
    {"id": "premier_league", "label": "Premier League"},
    {"id": "champions_league", "label": "Champions League"},
    {"id": "la_liga", "label": "La Liga"},
    {"id": "serie_a", "label": "Serie A"},
    {"id": "bundesliga", "label": "Bundesliga"},
    {"id": "mls", "label": "MLS"},
]

LEAGUE_LABEL_BY_ID: dict[str, str] = {row["id"]: row["label"] for row in LEAGUES_LIST}
