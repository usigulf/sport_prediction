"""Sportradar soccer standings parsing and provider note helpers."""
from unittest.mock import MagicMock

from app.config import Settings
from app.services import sportradar_soccer_service as soccer_svc
from app.services.sportradar_soccer_service import (
    find_soccer_standing_row,
    flatten_soccer_standings_rows,
    format_soccer_standings_line,
    soccer_health_probe,
    soccer_matchup_provider_note,
    soccer_season_id_for_league,
)


def test_flatten_prefers_total_block():
    data = {
        "standings": [
            {
                "type": "home",
                "groups": [
                    {
                        "standings": [
                            {"competitor": {"abbreviation": "XX"}, "rank": 1},
                        ]
                    }
                ],
            },
            {
                "type": "total",
                "groups": [
                    {
                        "standings": [
                            {
                                "competitor": {"abbreviation": "LIV", "name": "Liverpool FC"},
                                "rank": 1,
                                "win": 10,
                                "draw": 2,
                                "loss": 1,
                                "points": 32,
                                "goals_for": 30,
                                "goals_against": 10,
                                "goals_diff": 20,
                            },
                        ]
                    }
                ],
            },
        ]
    }
    rows = flatten_soccer_standings_rows(data)
    assert len(rows) == 1
    assert rows[0]["competitor"]["abbreviation"] == "LIV"


def test_find_soccer_standing_row_by_abbreviation():
    rows = [
        {
            "competitor": {"abbreviation": "ARS", "name": "Arsenal FC"},
            "rank": 2,
            "win": 8,
            "draw": 3,
            "loss": 2,
            "points": 27,
            "goals_for": 25,
            "goals_against": 15,
            "goals_diff": 10,
        }
    ]
    r = find_soccer_standing_row(rows, "ARS", "Arsenal")
    assert r is not None
    assert r["rank"] == 2


def test_find_soccer_standing_row_by_name_fallback():
    rows = [
        {
            "competitor": {"abbreviation": None, "name": "Manchester City FC"},
            "rank": 3,
            "win": 7,
            "draw": 4,
            "loss": 2,
            "points": 25,
            "goals_for": 22,
            "goals_against": 14,
            "goals_diff": 8,
        }
    ]
    r = find_soccer_standing_row(rows, None, "Manchester City")
    assert r is not None
    assert r["rank"] == 3


def test_format_soccer_standings_line():
    row = {
        "competitor": {"abbreviation": "LIV", "form": "WWDLW"},
        "rank": 1,
        "win": 10,
        "draw": 2,
        "loss": 1,
        "points": 32,
        "goals_for": 30,
        "goals_against": 10,
        "goals_diff": 20,
    }
    s = format_soccer_standings_line(row)
    assert "LIV" in s
    assert "10-2-1" in s
    assert "#1" in s
    assert "32 pts" in s
    assert "form WWDLW" in s


def test_soccer_season_id_for_league_from_settings(monkeypatch):
    monkeypatch.setenv("SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE", "sr:season:999")
    monkeypatch.setenv("SPORTRADAR_SOCCER_SEASON_CHAMPIONS_LEAGUE", "sr:season:888")
    s = Settings()
    assert soccer_season_id_for_league("premier_league", s) == "sr:season:999"
    assert soccer_season_id_for_league("champions_league", s) == "sr:season:888"
    assert soccer_season_id_for_league("nba", s) is None


def test_soccer_matchup_provider_note(monkeypatch):
    monkeypatch.setenv("SPORTRADAR_API_KEY", "k")
    monkeypatch.setenv("SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE", "sr:season:1")
    settings = Settings()
    soccer_svc._CACHE.clear()

    game = MagicMock()
    game.league = "premier_league"
    home = MagicMock()
    home.name = "Liverpool FC"
    home.abbreviation = "LIV"
    away = MagicMock()
    away.name = "Arsenal FC"
    away.abbreviation = "ARS"
    game.home_team = home
    game.away_team = away

    payload = {
        "standings": [
            {
                "type": "total",
                "groups": [
                    {
                        "standings": [
                            {
                                "competitor": {"abbreviation": "LIV", "name": "Liverpool FC"},
                                "rank": 1,
                                "win": 1,
                                "draw": 0,
                                "loss": 0,
                                "points": 3,
                                "goals_for": 2,
                                "goals_against": 0,
                                "goals_diff": 2,
                            },
                            {
                                "competitor": {"abbreviation": "ARS", "name": "Arsenal FC"},
                                "rank": 2,
                                "win": 0,
                                "draw": 1,
                                "loss": 0,
                                "points": 1,
                                "goals_for": 1,
                                "goals_against": 1,
                                "goals_diff": 0,
                            },
                        ]
                    }
                ],
            }
        ]
    }

    monkeypatch.setattr(
        soccer_svc,
        "_fetch_standings",
        lambda base, access, season_id, api_key: payload,
    )

    note = soccer_matchup_provider_note(game, settings)
    assert note is not None
    assert "Sportradar soccer" in note
    assert "Liverpool FC" in note
    assert "Arsenal FC" in note


def test_soccer_health_probe_empty():
    out = soccer_health_probe(Settings())
    assert out["soccer_configured"] is False
    assert out["soccer_standings_ok"] is None
    assert out["soccer_probe"] is None
    assert out["soccer_probes"] == []


def test_soccer_health_probe_all_configured_ok(monkeypatch):
    def fake_fetch(_settings, season_id: str):
        return ({"standings": []}, f"ok-{season_id}")

    monkeypatch.setattr(soccer_svc, "fetch_soccer_standings_json", fake_fetch)
    settings = Settings(
        sportradar_soccer_season_premier_league="sr:season:pl",
        sportradar_soccer_season_champions_league="sr:season:cl",
    )
    out = soccer_health_probe(settings)
    assert out["soccer_configured"] is True
    assert out["soccer_standings_ok"] is True
    assert "premier_league:ok-sr:season:pl" in out["soccer_probe"]
    assert "champions_league:ok-sr:season:cl" in out["soccer_probe"]
    assert len(out["soccer_probes"]) == 2
    assert all(p["ok"] for p in out["soccer_probes"])


def test_soccer_health_probe_one_fails(monkeypatch):
    def fake_fetch(_settings, season_id: str):
        if "pl" in season_id:
            return ({"standings": []}, "pl-ok")
        return (None, None)

    monkeypatch.setattr(soccer_svc, "fetch_soccer_standings_json", fake_fetch)
    settings = Settings(
        sportradar_soccer_season_premier_league="sr:season:pl",
        sportradar_soccer_season_champions_league="sr:season:cl",
    )
    out = soccer_health_probe(settings)
    assert out["soccer_standings_ok"] is False
    assert out["soccer_probe"] == "champions_league:sr:season:cl"
    assert [p["ok"] for p in out["soccer_probes"]] == [True, False]
