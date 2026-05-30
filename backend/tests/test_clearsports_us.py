"""ClearSports NFL/NBA sync helpers (no live API)."""
from datetime import datetime, timezone

from app.config import Settings
from app.services.clearsports_soccer_schedule_sync import normalize_clearsports_game
from app.services.clearsports_us_service import use_clearsports_us
from app.services import clearsports_us_schedule_sync as us_sync
from app.services.us_sports_sync_dispatch import sync_all_us_schedules, us_sync_result_payload


NBA_CS_PAYLOAD = {
    "game_key": "nba-2025-reg-bos-mil",
    "sport": "nba",
    "home_team": {"id": "BOS", "name": "Boston Celtics", "abbreviation": "BOS"},
    "away_team": {"id": "MIL", "name": "Milwaukee Bucks", "abbreviation": "MIL"},
    "scheduled_at": "2030-03-15T19:30:00Z",
    "status": "scheduled",
    "season": 2025,
    "venue": "TD Garden",
}


def test_normalize_clearsports_nba_unified_schema():
    fx = normalize_clearsports_game(NBA_CS_PAYLOAD, "nba")
    assert fx is not None
    assert fx["home"]["abbreviation"] == "BOS"
    assert fx["away"]["abbreviation"] == "MIL"
    assert fx["game_status"] == "scheduled"
    assert isinstance(fx["scheduled_time"], datetime)


def test_use_clearsports_us_with_key():
    assert use_clearsports_us(Settings(clearsports_api_key="k")) is True
    assert use_clearsports_us(Settings(clearsports_api_key="")) is False


def test_sync_clearsports_us_integration(db, monkeypatch):
    monkeypatch.setenv("CLEARSPORTS_API_KEY", "test-key")
    from app.config import get_settings

    get_settings.cache_clear()
    settings = get_settings()

    def fake_fetch(_settings, league, *, season=None, date=None):
        if league == "nfl":
            return [
                {
                    "id": "nfl-1",
                    "scheduled_at": "2030-09-10T00:20:00Z",
                    "status": "scheduled",
                    "home_team": {"name": "Kansas City Chiefs", "abbreviation": "KC"},
                    "away_team": {"name": "Buffalo Bills", "abbreviation": "BUF"},
                }
            ]
        return [NBA_CS_PAYLOAD]

    monkeypatch.setattr(us_sync, "fetch_clearsports_us_games", fake_fetch)

    results = us_sync.sync_all_clearsports_us_schedules(db, settings)
    assert results[0].games_upserted == 1
    assert results[1].games_upserted == 1

    from app.models.game import Game

    assert db.query(Game).filter(Game.league == "nfl").count() >= 1
    assert db.query(Game).filter(Game.league == "nba").count() >= 1
    get_settings.cache_clear()


def test_dispatch_prefers_clearsports(monkeypatch, db):
    monkeypatch.setenv("CLEARSPORTS_API_KEY", "cs")
    monkeypatch.setenv("SPORTRADAR_API_KEY", "sr")
    from app.config import get_settings

    get_settings.cache_clear()
    settings = get_settings()

    called = {"cs": False, "sr": False}

    def fake_cs(db, s):
        called["cs"] = True
        from app.services.sportradar_soccer_schedule_sync import SoccerScheduleSyncResult

        return [
            SoccerScheduleSyncResult(app_league="nfl", season_id="2025", games_upserted=1),
            SoccerScheduleSyncResult(app_league="nba", season_id="2025", games_upserted=2),
        ]

    def fake_sr(db, s):
        called["sr"] = True
        return []

    monkeypatch.setattr(
        "app.services.clearsports_us_schedule_sync.sync_all_clearsports_us_schedules",
        fake_cs,
    )
    monkeypatch.setattr("app.services.sportradar_us_schedule_sync.sync_all_us_schedules", fake_sr)

    results = sync_all_us_schedules(db, settings)
    assert called["cs"] and not called["sr"]
    payload = us_sync_result_payload(results[0])
    assert payload["provider"] == "clearsports"
    assert payload["league"] == "nfl"
    get_settings.cache_clear()
