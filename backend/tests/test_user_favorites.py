"""
Tests for user favorites endpoints (teams and leagues)
"""
import pytest
from fastapi import status


def test_get_favorites_empty(client, auth_headers):
    """Test get favorites when user has none"""
    response = client.get("/api/v1/user/favorites", headers=auth_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["teams"] == []
    assert data["leagues"] == []


def test_add_favorite_league(client, auth_headers):
    """Test adding a league to favorites"""
    response = client.post(
        "/api/v1/user/favorites/leagues/nfl",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert "added" in response.json()["message"].lower()

    get_resp = client.get("/api/v1/user/favorites", headers=auth_headers)
    assert get_resp.status_code == status.HTTP_200_OK
    assert len(get_resp.json()["leagues"]) == 1
    assert get_resp.json()["leagues"][0]["id"] == "nfl"
    assert "NFL" in get_resp.json()["leagues"][0]["name"]


def test_add_favorite_league_case_insensitive(client, auth_headers):
    """Test league code is normalized to lowercase"""
    client.post("/api/v1/user/favorites/leagues/NBA", headers=auth_headers)
    get_resp = client.get("/api/v1/user/favorites", headers=auth_headers)
    assert get_resp.json()["leagues"][0]["id"] == "nba"


def test_add_favorite_league_duplicate(client, auth_headers):
    """Test adding same league twice returns success (idempotent)"""
    client.post("/api/v1/user/favorites/leagues/nfl", headers=auth_headers)
    response = client.post(
        "/api/v1/user/favorites/leagues/nfl",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert "already" in response.json()["message"].lower()


def test_add_favorite_league_invalid(client, auth_headers):
    """Test adding unknown league returns 400"""
    response = client.post(
        "/api/v1/user/favorites/leagues/unknown_league",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "unknown" in response.json()["detail"].lower() or "allowed" in response.json()["detail"].lower()


def test_remove_favorite_league(client, auth_headers):
    """Test removing a league from favorites"""
    client.post("/api/v1/user/favorites/leagues/nfl", headers=auth_headers)
    response = client.delete(
        "/api/v1/user/favorites/leagues/nfl",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert "removed" in response.json()["message"].lower()

    get_resp = client.get("/api/v1/user/favorites", headers=auth_headers)
    assert get_resp.json()["leagues"] == []


def test_remove_favorite_league_not_found(client, auth_headers):
    """Test removing a league not in favorites returns 404"""
    response = client.delete(
        "/api/v1/user/favorites/leagues/nfl",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_favorites_require_auth(client):
    """Test get/add/remove favorites require authentication"""
    assert client.get("/api/v1/user/favorites").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.post("/api/v1/user/favorites/leagues/nfl").status_code == status.HTTP_401_UNAUTHORIZED
    assert client.delete("/api/v1/user/favorites/leagues/nfl").status_code == status.HTTP_401_UNAUTHORIZED


def test_get_favorites_prunes_legacy_league_codes(client, db, test_user, auth_headers):
    """League favorites outside ALLOWED_LEAGUE_CODES are removed on read (self-heal legacy rows)."""
    from app.models.user_favorite import UserFavorite

    db.add_all(
        [
            UserFavorite(user_id=test_user.id, entity_type="league", entity_id="nfl"),
            UserFavorite(user_id=test_user.id, entity_type="league", entity_id="mlb"),
        ]
    )
    db.commit()

    r = client.get("/api/v1/user/favorites", headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    leagues = r.json()["leagues"]
    assert len(leagues) == 1
    assert leagues[0]["id"] == "nfl"
    assert leagues[0]["name"] == "NFL"

    rows = (
        db.query(UserFavorite)
        .filter(UserFavorite.user_id == test_user.id, UserFavorite.entity_type == "league")
        .all()
    )
    assert {x.entity_id for x in rows} == {"nfl"}
