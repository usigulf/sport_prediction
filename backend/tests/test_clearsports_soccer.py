"""ClearSports soccer sync helpers (no live API)."""
from datetime import datetime, timezone

from app.services.clearsports_soccer_schedule_sync import (
    clearsports_game_id_to_uuid,
    normalize_clearsports_game,
)
from app.services.soccer_data_provider import use_clearsports_soccer
from app.config import Settings


def test_clearsports_game_uuid_stable():
    u1 = clearsports_game_id_to_uuid("epl", "42")
    u2 = clearsports_game_id_to_uuid("epl", "42")
    assert u1 == u2
    assert u1 != clearsports_game_id_to_uuid("epl", "43")


def test_normalize_clearsports_game_basic():
    raw = {
        "id": "99",
        "status": "scheduled",
        "start_time": "2025-05-23T15:00:00Z",
        "home_team": {"name": "Arsenal", "abbreviation": "ARS"},
        "away_team": {"name": "Chelsea", "abbreviation": "CHE"},
        "home_score": 0,
        "away_score": 0,
    }
    fx = normalize_clearsports_game(raw, "epl")
    assert fx is not None
    assert fx["sport_event_id"] == "clearsports:epl:99"
    assert fx["game_status"] == "scheduled"
    assert fx["home"]["abbreviation"] == "ARS"
    assert isinstance(fx["scheduled_time"], datetime)


def test_use_clearsports_when_only_cs_key():
    s = Settings(clearsports_api_key="k", sportradar_api_key="")
    assert use_clearsports_soccer(s) is True


def test_use_sportradar_when_both_keys():
    s = Settings(clearsports_api_key="k", sportradar_api_key="sr")
    assert use_clearsports_soccer(s) is False
