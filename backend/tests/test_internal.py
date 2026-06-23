"""Internal cron / ops routes (X-Cron-Secret)."""
from unittest.mock import patch

import pytest
from fastapi import status

from app.config import get_settings
from app.models.game_player_spotlight import GamePlayerSpotlight


@pytest.fixture(autouse=True)
def push_cron_secret_for_internal(monkeypatch):
    monkeypatch.setenv("PUSH_CRON_SECRET", "test-cron-secret-internal")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _headers():
    return {"X-Cron-Secret": "test-cron-secret-internal"}


def test_replace_player_spotlights_requires_secret(client, test_game):
    r = client.put(
        f"/internal/games/{test_game.id}/player-spotlights",
        json={"spotlights": []},
    )
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_replace_and_clear_player_spotlights(client, test_game, db):
    body = {
        "spotlights": [
            {
                "player_name": "A. Player",
                "team_name": "Team A",
                "role": "QB",
                "summary": "Strong recent form.",
                "sort_order": 0,
            },
            {
                "player_name": "B. Player",
                "team_name": "Team B",
                "role": None,
                "summary": "Injury question.",
                "sort_order": 1,
            },
        ]
    }
    r = client.put(
        f"/internal/games/{test_game.id}/player-spotlights",
        json=body,
        headers=_headers(),
    )
    assert r.status_code == status.HTTP_200_OK
    assert r.json()["spotlights_written"] == 2
    assert db.query(GamePlayerSpotlight).filter(GamePlayerSpotlight.game_id == test_game.id).count() == 2

    r2 = client.put(
        f"/internal/games/{test_game.id}/player-spotlights",
        json={"spotlights": [{"player_name": "Only", "team_name": "One", "summary": "x"}]},
        headers=_headers(),
    )
    assert r2.status_code == status.HTTP_200_OK
    rows = db.query(GamePlayerSpotlight).filter(GamePlayerSpotlight.game_id == test_game.id).all()
    assert len(rows) == 1
    assert rows[0].player_name == "Only"

    r3 = client.delete(
        f"/internal/games/{test_game.id}/player-spotlights",
        headers=_headers(),
    )
    assert r3.status_code == status.HTTP_200_OK
    assert r3.json()["spotlights_deleted"] == 1
    assert db.query(GamePlayerSpotlight).filter(GamePlayerSpotlight.game_id == test_game.id).count() == 0


def test_replace_player_spotlights_game_not_found(client):
    fake = "00000000-0000-0000-0000-000000000000"
    r = client.put(
        f"/internal/games/{fake}/player-spotlights",
        json={"spotlights": []},
        headers=_headers(),
    )
    assert r.status_code == status.HTTP_404_NOT_FOUND


def test_sportradar_health_not_configured(monkeypatch, client):
    monkeypatch.delenv("SPORTRADAR_API_KEY", raising=False)
    monkeypatch.setenv("SPORTRADAR_API_KEY", "")
    get_settings.cache_clear()
    r = client.get("/internal/health/sportradar", headers=_headers())
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["configured"] is False
    assert body["nfl_standings_ok"] is False
    assert body["soccer_configured"] is False
    assert body["soccer_standings_ok"] is None
    assert body.get("soccer_probes") == []


def test_sportradar_health_ok(monkeypatch, client):
    monkeypatch.setenv("SPORTRADAR_API_KEY", "fake-key-for-test")
    get_settings.cache_clear()
    monkeypatch.setattr(
        "app.api.internal.fetch_nfl_standings_json",
        lambda _s: ({"conferences": []}, "REG 2025"),
    )

    r = client.get("/internal/health/sportradar", headers=_headers())
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["configured"] is True
    assert body["nfl_standings_ok"] is True
    assert body["standings_source"] == "REG 2025"
    assert body["soccer_configured"] is False
    assert body["soccer_standings_ok"] is None
    assert body.get("soccer_probes") == []


def test_sportradar_health_soccer_ok(monkeypatch, client):
    monkeypatch.setenv("SPORTRADAR_API_KEY", "fake-key-for-test")
    monkeypatch.setenv("SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE", "sr:season:1")
    get_settings.cache_clear()
    monkeypatch.setattr(
        "app.api.internal.fetch_nfl_standings_json",
        lambda _s: (None, None),
    )
    monkeypatch.setattr(
        "app.api.internal.soccer_health_probe",
        lambda _s: {
            "soccer_configured": True,
            "soccer_standings_ok": True,
            "soccer_probe": "premier_league:sr:season:1",
            "soccer_probes": [
                {"league": "premier_league", "season_id": "sr:season:1", "ok": True, "label": "sr:season:1"},
            ],
        },
    )

    r = client.get("/internal/health/sportradar", headers=_headers())
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["configured"] is True
    assert body["nfl_standings_ok"] is False
    assert body["soccer_standings_ok"] is True
    assert body["soccer_probe"] == "premier_league:sr:season:1"


def test_sportradar_health_requires_secret(client):
    r = client.get("/internal/health/sportradar")
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_clearsports_health_not_configured(monkeypatch, client):
    monkeypatch.delenv("CLEARSPORTS_API_KEY", raising=False)
    monkeypatch.setenv("CLEARSPORTS_API_KEY", "")
    get_settings.cache_clear()
    r = client.get("/internal/health/clearsports", headers=_headers())
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["clearsports_configured"] is False
    assert body["clearsports_ok"] is False


def test_clearsports_health_ok(monkeypatch, client):
    monkeypatch.setenv("CLEARSPORTS_API_KEY", "fake-key-for-test")
    get_settings.cache_clear()
    monkeypatch.setattr(
        "app.api.internal.clearsports_health_probe",
        lambda _s: {
            "clearsports_configured": True,
            "clearsports_ok": True,
            "clearsports_http_status": 200,
            "sample_epl_games_count": 3,
            "clearsports_base_url": "https://api.clearsportsapi.com",
        },
    )
    r = client.get("/internal/health/clearsports", headers=_headers())
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["clearsports_ok"] is True
    assert body["sample_epl_games_count"] == 3


def test_clearsports_health_requires_secret(client):
    r = client.get("/internal/health/clearsports")
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_internal_allowlist_blocks_disallowed_ip(monkeypatch, client):
    monkeypatch.setenv("INTERNAL_ALLOWED_CIDRS", "10.0.0.0/8")
    monkeypatch.setenv("TRUST_FORWARDED_HEADERS", "true")
    get_settings.cache_clear()
    r = client.get(
        "/internal/health/clearsports",
        headers={**_headers(), "X-Forwarded-For": "8.8.8.8"},
    )
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_internal_allowlist_allows_allowed_ip(monkeypatch, client):
    monkeypatch.setenv("INTERNAL_ALLOWED_CIDRS", "10.0.0.0/8,127.0.0.1/32")
    monkeypatch.setenv("TRUST_FORWARDED_HEADERS", "true")
    monkeypatch.setattr(
        "app.api.internal.clearsports_health_probe",
        lambda _s: {
            "clearsports_configured": True,
            "clearsports_ok": True,
            "clearsports_http_status": 200,
            "sample_epl_games_count": 1,
            "clearsports_base_url": "https://api.clearsportsapi.com",
        },
    )
    get_settings.cache_clear()
    r = client.get(
        "/internal/health/clearsports",
        headers={**_headers(), "X-Forwarded-For": "10.1.2.3"},
    )
    assert r.status_code == status.HTTP_200_OK


def test_soccer_sync_schedules_route(monkeypatch, client):
    from app.services.sportradar_soccer_schedule_sync import SoccerScheduleSyncResult
    from app.services.sportradar_soccer_standings_sync import SoccerStandingsSyncResult

    monkeypatch.setattr(
        "app.api.internal.configured_soccer_league_codes",
        lambda _settings: ["premier_league", "champions_league"],
    )

    def fake_sync(db, app_league, settings):
        return SoccerScheduleSyncResult(
            app_league=app_league,
            season_id="sr:season:test",
            rows_fetched=2,
            games_upserted=2,
            rows_skipped=0,
            errors=[],
        )

    def fake_standings(db, app_league, settings):
        return SoccerStandingsSyncResult(
            app_league=app_league,
            season_id="sr:season:test",
            rows_seen=20,
            upserted=18,
            skipped=2,
            errors=[],
        )

    monkeypatch.setattr("app.api.internal.sync_soccer_schedule_for_league", fake_sync)
    monkeypatch.setattr("app.api.internal.sync_soccer_standings_for_league", fake_standings)
    r = client.post("/internal/soccer/sync-schedules", headers=_headers())
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert len(body["results"]) == 2
    assert body["results"][0]["league"] == "premier_league"
    assert body["results"][0]["games_upserted"] == 2
    assert body["results"][0]["standings_upserted"] == 18


def test_internal_ml_train(client, monkeypatch, tmp_path):
    monkeypatch.setenv("MODEL_ARTIFACT_DIR", str(tmp_path))
    get_settings.cache_clear()
    captured: dict = {}

    def fake_train(db, out_dir, **kwargs):
        captured["out_dir"] = out_dir
        captured["kwargs"] = kwargs
        return {"games": 120, "eval": {"accuracy": 0.61}, "out_dir": out_dir}

    monkeypatch.setattr("app.api.internal.train_and_save", fake_train)
    try:
        r = client.post(
            "/internal/ml/train",
            headers=_headers(),
            json={"min_games": 50, "force": True},
        )
        assert r.status_code == status.HTTP_200_OK, r.text
        assert r.json()["games"] == 120
        assert captured["out_dir"] == str(tmp_path)
        assert captured["kwargs"]["min_games"] == 50
        assert captured["kwargs"]["force"] is True
    finally:
        get_settings.cache_clear()


@patch("app.api.internal.send_game_starting_reminders", return_value=2)
@patch("app.api.internal.send_high_confidence_picks", return_value=1)
@patch("app.api.internal.send_post_game_results", return_value=3)
def test_run_push_triggers(mock_post_game, mock_picks, mock_reminders, client):
    r = client.post("/internal/push-triggers/run", headers=_headers())
    assert r.status_code == status.HTTP_200_OK
    assert r.json() == {
        "game_reminders_sent": 2,
        "high_confidence_picks_sent": 1,
        "post_game_results_sent": 3,
    }
    mock_reminders.assert_called_once()
    mock_picks.assert_called_once()
    mock_post_game.assert_called_once()