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


def test_get_prediction_explanation_rich_analysis(client, auth_headers, test_game, test_prediction, db):
    """Optional narrative sections are returned when stored on the prediction."""
    test_prediction.rich_analysis = {
        "real_time_analysis": "Sample live context from data pipeline.",
        "form_standings": "Home 3rd in table; away 9th.",
    }
    db.add(test_prediction)
    db.commit()

    response = client.get(
        f"/api/v1/games/{test_game.id}/explanation",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["rich_analysis"] is not None
    assert data["rich_analysis"]["real_time_analysis"] == "Sample live context from data pipeline."
    assert data["rich_analysis"]["form_standings"] == "Home 3rd in table; away 9th."
    assert data["rich_analysis"].get("scenario_outcomes")
    assert "Possible outcomes" in data["rich_analysis"]["scenario_outcomes"]


def test_explanation_enriches_h2h_and_standings(client, premium_auth_headers, db, test_teams, test_game, test_prediction):
    """DB-backed H2H + standings appear on explanation when rows exist."""
    from uuid import uuid4
    from app.models.game import Game
    from app.models.team_standing import TeamStanding

    for i in range(2):
        g = Game(
            id=uuid4(),
            league="nfl",
            home_team_id=test_teams[0].id,
            away_team_id=test_teams[1].id,
            scheduled_time=datetime.now() - timedelta(days=30 * (i + 1)),
            status="finished",
            home_score=24 + i,
            away_score=17,
        )
        db.add(g)
    for rank, tid in enumerate([test_teams[0].id, test_teams[1].id], start=1):
        db.add(
            TeamStanding(
                id=uuid4(),
                league="nfl",
                team_id=tid,
                league_rank=rank,
                played=10,
                wins=6,
                draws=0,
                losses=4,
                points=18,
                goals_for=240,
                goals_against=200,
            )
        )
    db.commit()

    response = client.get(
        f"/api/v1/games/{test_game.id}/explanation",
        headers=premium_auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    ra = data["rich_analysis"]
    assert ra is not None
    assert ra.get("h2h_history")
    assert "Last 2 meeting" in ra["h2h_history"]
    assert ra.get("standings_context")
    assert "#1" in ra["standings_context"] or "#2" in ra["standings_context"]
    assert ra.get("advanced_metrics")
    assert "scoring environment" in ra["advanced_metrics"].lower()

    struct = data.get("structured_analysis")
    assert struct is not None
    assert len(struct.get("standings_rows") or []) == 2
    assert len(struct.get("h2h_meetings") or []) == 2
    assert struct.get("h2h_series_summary")
    assert len(struct.get("metric_comparisons") or []) >= 3
    assert struct.get("data_freshness_note")


def test_get_live_prediction_requires_premium(client, auth_headers, test_game, db):
    """Test that live predictions require premium"""
    test_game.status = "live"
    db.commit()

    response = client.get(
        f"/api/v1/games/{test_game.id}/live-predictions",
        headers=auth_headers
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "premium" in response.json()["detail"].lower()


def test_get_live_prediction_premium_user(client, premium_auth_headers, test_game, db):
    """Test premium user getting live predictions"""
    test_game.status = "live"
    db.commit()

    response = client.get(
        f"/api/v1/games/{test_game.id}/live-predictions",
        headers=premium_auth_headers
    )
    # Should either return data or 404 if no live prediction exists yet
    assert response.status_code in [status.HTTP_200_OK, status.HTTP_404_NOT_FOUND]
