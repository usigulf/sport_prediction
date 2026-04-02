"""Sportradar NFL standings parsing (no live HTTP in unit tests)."""
from types import SimpleNamespace

from app.services import sportradar_nfl_service as sr


MINIMAL_STANDINGS = {
    "conferences": [
        {
            "divisions": [
                {
                    "teams": [
                        {
                            "alias": "KC",
                            "wins": 11,
                            "losses": 5,
                            "ties": 0,
                            "points_for": 400,
                            "points_against": 300,
                            "rank": {"division": 1, "conference": 2},
                            "streak": {"desc": "Won 2"},
                        },
                        {
                            "alias": "BUF",
                            "wins": 12,
                            "losses": 4,
                            "ties": 0,
                            "points_for": 380,
                            "points_against": 310,
                            "rank": {"division": 1, "conference": 1},
                            "streak": {"desc": "Lost 1"},
                        },
                    ]
                }
            ]
        }
    ]
}


def test_find_team_and_format_line():
    t = sr.find_team_by_alias(MINIMAL_STANDINGS, "kc")
    assert t is not None
    line = sr.format_team_standings_line(t)
    assert "KC" in line
    assert "11-5" in line
    assert "PF/PA" in line


def test_nfl_matchup_provider_note_builds_text(monkeypatch):
    monkeypatch.setattr(sr, "fetch_nfl_standings_json", lambda _s: (MINIMAL_STANDINGS, "REG 2025"))

    game = SimpleNamespace(
        league="nfl",
        home_team=SimpleNamespace(name="Kansas City Chiefs", abbreviation="KC"),
        away_team=SimpleNamespace(name="Buffalo Bills", abbreviation="BUF"),
    )
    settings = SimpleNamespace(
        sportradar_api_key="fake",
        sportradar_api_url="https://api.sportradar.com",
        sportradar_access_level="trial",
        sportradar_nfl_season_year=2025,
    )
    note = sr.nfl_matchup_provider_note(game, settings)
    assert note
    assert "Kansas City" in note
    assert "Buffalo" in note
    assert "Sportradar" in note


def test_nfl_matchup_skips_non_nfl():
    game = SimpleNamespace(
        league="nba",
        home_team=SimpleNamespace(name="A", abbreviation="LAL"),
        away_team=SimpleNamespace(name="B", abbreviation="BOS"),
    )
    settings = SimpleNamespace(sportradar_api_key="x")
    assert sr.nfl_matchup_provider_note(game, settings) is None


def test_fetch_fallback_tries_pre_after_reg(monkeypatch):
    calls: list[tuple[int, str]] = []

    def fake_fetch(base, access, year, season_type, api_key):
        calls.append((year, season_type))
        if season_type == "PRE":
            return MINIMAL_STANDINGS
        return None

    monkeypatch.setattr(sr, "_fetch_season_standings", fake_fetch)
    settings = SimpleNamespace(
        sportradar_api_key="k",
        sportradar_api_url="https://api.sportradar.com",
        sportradar_access_level="trial",
        sportradar_nfl_season_year=2025,
    )
    sr._CACHE.clear()
    data, label = sr.fetch_nfl_standings_json(settings)
    assert data == MINIMAL_STANDINGS
    assert label == "PRE 2025"
    assert calls[0][1] == "REG"
    assert calls[1][1] == "PRE"
