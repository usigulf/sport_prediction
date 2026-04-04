"""Internal cron / ops routes (X-Cron-Secret)."""
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
