"""POST /internal/live/sync-run"""
import pytest
from fastapi import status

from app.config import get_settings


@pytest.fixture(autouse=True)
def push_cron_secret_for_live_sync(monkeypatch):
    monkeypatch.setenv("PUSH_CRON_SECRET", "test-cron-secret-internal")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _headers():
    return {"X-Cron-Secret": "test-cron-secret-internal"}


def test_live_sync_requires_secret(client):
    r = client.post("/internal/live/sync-run", json={})
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_live_sync_no_live_games(client):
    r = client.post("/internal/live/sync-run", headers=_headers(), json={})
    assert r.status_code == status.HTTP_200_OK
    data = r.json()
    assert data["live_games"] == 0
    assert data["predictions_written"] == 0
