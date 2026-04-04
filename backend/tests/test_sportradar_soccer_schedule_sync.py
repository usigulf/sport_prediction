"""Sportradar soccer schedule → games sync helpers."""
from app.models.game import Game
from app.models.team import Team
from app.services.sportradar_soccer_schedule_sync import (
    normalize_schedule_row,
    sport_event_id_to_game_uuid,
    sync_soccer_schedule_for_league,
)


def test_sport_event_id_to_game_uuid_stable():
    u1 = sport_event_id_to_game_uuid("sr:sport_event:123")
    u2 = sport_event_id_to_game_uuid("sr:sport_event:123")
    assert u1 == u2
    assert u1.version == 5


def test_normalize_schedule_row_basic():
    row = {
        "sport_event": {
            "id": "sr:sport_event:999",
            "start_time": "2026-03-30T15:00:00+00:00",
            "venue": {"name": "Anfield"},
            "competitors": [
                {"qualifier": "home", "name": "Liverpool FC", "abbreviation": "LIV"},
                {"qualifier": "away", "name": "Arsenal FC", "abbreviation": "ARS"},
            ],
        },
        "sport_event_status": {
            "status": "not_started",
            "home_score": 0,
            "away_score": 0,
        },
    }
    f = normalize_schedule_row(row)
    assert f is not None
    assert f["sport_event_id"] == "sr:sport_event:999"
    assert f["game_status"] == "scheduled"
    assert f["venue"] == "Anfield"
    assert f["home"]["abbreviation"] == "LIV"


def test_normalize_schedule_row_live():
    row = {
        "sport_event": {
            "id": "sr:sport_event:1",
            "start_time": "2026-03-30T15:00:00+00:00",
            "competitors": [
                {"qualifier": "home", "name": "A", "abbreviation": "AA"},
                {"qualifier": "away", "name": "B", "abbreviation": "BB"},
            ],
        },
        "sport_event_status": {"status": "live", "home_score": 1, "away_score": 0},
    }
    f = normalize_schedule_row(row)
    assert f["game_status"] == "live"
    assert f["home_score"] == 1


def test_normalize_schedule_row_skips_virtual():
    row = {
        "sport_event": {
            "id": "sr:sport_event:v",
            "start_time": "2026-03-30T15:00:00+00:00",
            "competitors": [
                {"qualifier": "home", "name": "TBD", "virtual": True},
                {"qualifier": "away", "name": "B", "abbreviation": "BB"},
            ],
        },
        "sport_event_status": {},
    }
    assert normalize_schedule_row(row) is None


def test_sync_soccer_schedule_integration(db, monkeypatch):
    monkeypatch.setenv("SPORTRADAR_API_KEY", "k")
    monkeypatch.setenv("SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE", "sr:season:pl")

    from app.config import get_settings

    get_settings.cache_clear()

    def fake_fetch(_settings, _sid):
        return [
            {
                "sport_event": {
                    "id": "sr:sport_event:sync1",
                    "start_time": "2026-04-01T12:00:00+00:00",
                    "competitors": [
                        {"qualifier": "home", "name": "Alpha FC", "abbreviation": "ALP"},
                        {"qualifier": "away", "name": "Beta FC", "abbreviation": "BET"},
                    ],
                },
                "sport_event_status": {"status": "not_started", "home_score": 0, "away_score": 0},
            }
        ]

    monkeypatch.setattr(
        "app.services.sportradar_soccer_schedule_sync.fetch_season_schedule_summaries",
        fake_fetch,
    )

    settings = get_settings()
    r = sync_soccer_schedule_for_league(db, "premier_league", settings)
    assert r.games_upserted == 1
    assert r.rows_fetched == 1
    assert not r.errors

    gid = sport_event_id_to_game_uuid("sr:sport_event:sync1")
    g = db.get(Game, gid)
    assert g is not None
    assert g.league == "premier_league"
    assert g.status == "scheduled"
    ht = db.get(Team, g.home_team_id)
    at = db.get(Team, g.away_team_id)
    assert ht.abbreviation == "ALP"
    assert at.abbreviation == "BET"
