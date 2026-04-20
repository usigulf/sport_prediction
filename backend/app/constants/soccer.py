"""Soccer league codes: schedules + standings when Sportradar season env is set."""

SOCCER_LEAGUE_CODES: tuple[str, ...] = (
    "premier_league",
    "champions_league",
    "la_liga",
    "serie_a",
    "bundesliga",
    "mls",
)

SOCCER_LEAGUES_SET = frozenset(SOCCER_LEAGUE_CODES)
