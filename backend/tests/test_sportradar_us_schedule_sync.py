"""Sportradar NFL/NBA schedule sync helpers (no live HTTP)."""
from datetime import datetime, timezone

from app.services import sportradar_us_schedule_sync as us_sync


MINIMAL_NFL_SCHEDULE = {
    "year": 2025,
    "type": "REG",
    "weeks": [
        {
            "sequence": 1,
            "games": [
                {
                    "id": "game-nfl-1",
                    "status": "scheduled",
                    "scheduled": "2026-09-10T00:20:00+00:00",
                    "home": {"name": "Kansas City Chiefs", "alias": "KC"},
                    "away": {"name": "Buffalo Bills", "alias": "BUF"},
                    "venue": {"name": "Arrowhead Stadium"},
                }
            ],
        }
    ],
}

MINIMAL_NBA_SCHEDULE = {
    "year": 2025,
    "type": "REG",
    "games": [
        {
            "id": "game-nba-1",
            "status": "closed",
            "scheduled": "2025-11-05T00:00:00Z",
            "home_points": 110,
            "away_points": 102,
            "home": {"name": "Los Angeles Lakers", "alias": "LAL"},
            "away": {"name": "Boston Celtics", "alias": "BOS"},
            "venue": {"name": "Crypto.com Arena"},
        }
    ],
}


def test_iter_schedule_games_nfl_weeks():
    games = us_sync.iter_schedule_games(MINIMAL_NFL_SCHEDULE)
    assert len(games) == 1
    assert games[0]["id"] == "game-nfl-1"


def test_iter_schedule_games_nba_flat():
    games = us_sync.iter_schedule_games(MINIMAL_NBA_SCHEDULE)
    assert len(games) == 1


def test_normalize_us_schedule_game():
    raw = MINIMAL_NFL_SCHEDULE["weeks"][0]["games"][0]
    fx = us_sync.normalize_us_schedule_game(raw)
    assert fx is not None
    assert fx["sport_event_id"] == "game-nfl-1"
    assert fx["game_status"] == "scheduled"
    assert fx["home"]["abbreviation"] == "KC"


def test_normalize_finished_nba_scores():
    raw = MINIMAL_NBA_SCHEDULE["games"][0]
    fx = us_sync.normalize_us_schedule_game(raw)
    assert fx is not None
    assert fx["game_status"] == "finished"
    assert fx["home_score"] == 110
    assert fx["away_score"] == 102


def test_default_season_years():
    assert us_sync.default_nfl_season_year(datetime(2026, 5, 1, tzinfo=timezone.utc)) == 2025
    assert us_sync.default_nba_season_year(datetime(2026, 5, 1, tzinfo=timezone.utc)) == 2025
    assert us_sync.default_nba_season_year(datetime(2026, 11, 1, tzinfo=timezone.utc)) == 2026


def test_sync_us_schedule_integration(db, monkeypatch):
    monkeypatch.setenv("SPORTRADAR_API_KEY", "test-key")
    from app.config import get_settings

    get_settings.cache_clear()
    settings = get_settings()

    def fake_fetch(_settings, league, year, season_type="REG"):
        if league == "nfl":
            return MINIMAL_NFL_SCHEDULE
        return MINIMAL_NBA_SCHEDULE

    monkeypatch.setattr(us_sync, "_fetch_schedule_json", fake_fetch)

    r_nfl = us_sync.sync_us_schedule(db, "nfl", settings)
    assert r_nfl.games_upserted == 1
    assert not r_nfl.errors

    r_nba = us_sync.sync_us_schedule(db, "nba", settings)
    assert r_nba.games_upserted == 1

    from app.models.game import Game

    nfl_games = db.query(Game).filter(Game.league == "nfl").all()
    nba_games = db.query(Game).filter(Game.league == "nba").all()
    assert len(nfl_games) >= 1
    assert len(nba_games) >= 1
    assert nfl_games[0].home_team.abbreviation == "KC"

    get_settings.cache_clear()


def test_us_sports_sync_schedules_route(monkeypatch, client):
    from app.config import get_settings
    from app.services.sportradar_us_schedule_sync import UsScheduleSyncResult

    monkeypatch.setenv("PUSH_CRON_SECRET", "test-cron-secret-internal")
    get_settings.cache_clear()

    def fake_sync_all(_db, _settings):
        return [
            UsScheduleSyncResult(league="nfl", season_year=2025, season_type="REG", games_upserted=100),
            UsScheduleSyncResult(league="nba", season_year=2025, season_type="REG", games_upserted=200),
        ]

    monkeypatch.setattr("app.api.internal.sync_all_us_schedules", fake_sync_all)
    r = client.post("/internal/us-sports/sync-schedules", headers={"X-Cron-Secret": "test-cron-secret-internal"})
    assert r.status_code == 200
    body = r.json()
    assert len(body["results"]) == 2
    assert body["results"][0]["league"] == "nfl"
    assert body["results"][0]["provider"] == "sportradar"
    assert body["results"][1]["games_upserted"] == 200
    get_settings.cache_clear()
