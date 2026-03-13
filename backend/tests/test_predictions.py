"""
Tests for prediction endpoints
"""
import pytest
from fastapi import status
from datetime import datetime, timedelta


def test_get_upcoming_games(client):
    """Test getting upcoming games"""
    response = client.get("/api/v1/games/upcoming")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "games" in data
    assert isinstance(data["games"], list)


def test_get_upcoming_games_with_league_filter(client, test_game):
    """Test filtering games by league"""
    response = client.get("/api/v1/games/upcoming?league=nfl")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(game["league"] == "nfl" for game in data["games"])


def test_get_game_details(client, test_game):
    """Test getting game details"""
    response = client.get(f"/api/v1/games/{test_game.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["id"] == str(test_game.id)
    assert data["league"] == test_game.league


def test_get_game_not_found(client):
    """Test getting non-existent game"""
    fake_id = "00000000-0000-0000-0000-000000000000"
    response = client.get(f"/api/v1/games/{fake_id}")
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_get_prediction_free_user(client, auth_headers, test_game, test_prediction):
    """Test free user getting prediction"""
    response = client.get(
        f"/api/v1/games/{test_game.id}/predictions",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "home_win_probability" in data
    assert "away_win_probability" in data


def test_get_prediction_exceeds_daily_limit(client, auth_headers, test_game, test_prediction, db):
    """Test free user exceeding daily prediction limit"""
    from app.services.cache_service import CacheService
    from app.models.user import User
    
    # Simulate exceeding daily limit
    cache = CacheService()
    user = db.query(User).filter(User.email == "test@example.com").first()
    cache_key = f"daily_predictions:{user.id}:{datetime.now().date()}"
    cache.set(cache_key, 10, ttl=86400)  # Set to limit
    
    response = client.get(
        f"/api/v1/games/{test_game.id}/predictions",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "limit" in response.json()["detail"].lower()


def test_get_prediction_premium_user(client, premium_auth_headers, test_game, test_prediction):
    """Test premium user getting unlimited predictions"""
    response = client.get(
        f"/api/v1/games/{test_game.id}/predictions",
        headers=premium_auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "home_win_probability" in data


def test_get_prediction_explanation(client, auth_headers, test_game, test_prediction):
    """Test getting prediction explanation"""
    response = client.get(
        f"/api/v1/games/{test_game.id}/explanation",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "top_features" in data or "explanation" in data


def test_get_live_prediction_requires_premium(client, auth_headers, test_game):
    """Test that live predictions require premium"""
    # Update game to live status
    test_game.status = "live"
    from app.database import SessionLocal
    db = SessionLocal()
    db.add(test_game)
    db.commit()
    
    response = client.get(
        f"/api/v1/games/{test_game.id}/live-predictions",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "premium" in response.json()["detail"].lower()


def test_get_live_prediction_premium_user(client, premium_auth_headers, test_game):
    """Test premium user getting live predictions"""
    # Update game to live status
    test_game.status = "live"
    from app.database import SessionLocal
    db = SessionLocal()
    db.add(test_game)
    db.commit()
    
    response = client.get(
        f"/api/v1/games/{test_game.id}/live-predictions",
        headers=premium_auth_headers
    )
    # Should either return data or 404 if no live prediction exists yet
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
