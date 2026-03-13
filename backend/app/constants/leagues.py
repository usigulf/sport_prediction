"""
League codes and labels for filters, favorites, and API.
Must match games/teams data (seed script and client).
"""
ALLOWED_LEAGUE_CODES = {
    "nfl",
    "nba",
    "mlb",
    "nhl",
    "premier_league",
    "champions_league",
    "boxing",
    "tennis",
    "golf",
    "mma",
}

# For GET /games/leagues: id + display label (soccer grouped as "Soccer" for Premier + UCL)
LEAGUES_LIST = [
    {"id": "nfl", "label": "NFL"},
    {"id": "nba", "label": "NBA"},
    {"id": "mlb", "label": "MLB"},
    {"id": "nhl", "label": "NHL"},
    {"id": "premier_league", "label": "Premier League"},
    {"id": "champions_league", "label": "Champions League"},
    {"id": "boxing", "label": "Boxing"},
    {"id": "tennis", "label": "Tennis"},
    {"id": "golf", "label": "Golf"},
    {"id": "mma", "label": "MMA"},
]
