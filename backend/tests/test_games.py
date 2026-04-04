"""
Tests for games API: leagues, pagination, scheduled_time ISO 8601
"""
import re
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import status


def test_get_leagues(client):
    """GET /games/leagues returns list of allowed leagues with id and label"""
    response = client.get("/api/v1/games/leagues")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "leagues" in data
    leagues = data["leagues"]
    assert isinstance(leagues, list)
    assert len(leagues) >= 1
    for item in leagues:
        assert "id" in item
        assert "label" in item
    ids = [x["id"] for x in leagues]
    assert "nfl" in ids
    assert "nba" in ids


def test_upcoming_pagination_limit_max(client, test_game):
    """Upcoming accepts limit up to 100; limit=101 returns 422"""
    # Valid: limit=100
    r = client.get("/api/v1/games/upcoming", params={"limit": 100})
    assert r.status_code == status.HTTP_200_OK
    # Invalid: limit too high
    r2 = client.get("/api/v1/games/upcoming", params={"limit": 101})
    assert r2.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    # Invalid: limit 0
    r3 = client.get("/api/v1/games/upcoming", params={"limit": 0})
    assert r3.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_upcoming_pagination_skip(client, test_game):
    """Upcoming accepts skip >= 0"""
    r = client.get("/api/v1/games/upcoming", params={"skip": 0, "limit": 10})
    assert r.status_code == status.HTTP_200_OK
    r2 = client.get("/api/v1/games/upcoming", params={"skip": 5, "limit": 5})
    assert r2.status_code == status.HTTP_200_OK


def test_upcoming_scheduled_time_iso(client, test_game):
    """Upcoming games return scheduled_time as ISO 8601 (e.g. ends with Z or contains T)"""
    response = client.get("/api/v1/games/upcoming", params={"limit": 10})
    assert response.status_code == status.HTTP_200_OK
    games = response.json().get("games", [])
    assert len(games) >= 1
    for g in games:
        st = g.get("scheduled_time")
        assert st is not None, "scheduled_time must be present"
        # ISO 8601: has 'T' and either 'Z' or timezone offset
        assert "T" in st, "scheduled_time should be ISO 8601"
        assert re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", st), "scheduled_time should be date and time"


def test_get_game_scheduled_time_iso(client, test_game):
    """Single game GET returns scheduled_time as ISO 8601"""
    response = client.get(f"/api/v1/games/{test_game.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    st = data.get("scheduled_time")
    assert st is not None
    assert "T" in st
    assert re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}", st)


def test_upcoming_date_filter_with_time_zone(client, db, test_game):
    """date + time_zone returns games on that calendar day (scheduled/live/finished)."""
    fixed = datetime(2030, 6, 15, 18, 30, tzinfo=timezone.utc)
    test_game.scheduled_time = fixed
    test_game.status = "scheduled"
    db.commit()

    r = client.get(
        "/api/v1/games/upcoming",
        params={"date": "2030-06-15", "time_zone": "UTC", "limit": 50},
    )
    assert r.status_code == status.HTTP_200_OK
    ids = [g["id"] for g in r.json().get("games", [])]
    assert str(test_game.id) in ids


def test_upcoming_invalid_time_zone(client):
    r = client.get(
        "/api/v1/games/upcoming",
        params={"date": "2030-01-01", "time_zone": "Not/A_Real_Zone", "limit": 10},
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST
