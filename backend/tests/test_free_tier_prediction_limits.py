"""Tests for free-tier daily prediction view limits."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import status

from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.services.free_tier_limits import (
    FREE_TIER_DAILY_PREDICTION_LIMIT,
    FreeTierPredictionLimiter,
)


def test_record_prediction_view_dedupes_same_game():
    limiter = FreeTierPredictionLimiter()
    user_id = uuid4()
    game_id = uuid4()

    assert limiter.record_prediction_view(user_id, game_id) is True
    assert limiter.get_view_count(user_id) == 1
    assert limiter.record_prediction_view(user_id, game_id) is True
    assert limiter.get_view_count(user_id) == 1


def test_record_prediction_view_enforces_daily_limit():
    limiter = FreeTierPredictionLimiter()
    user_id = uuid4()

    for _ in range(FREE_TIER_DAILY_PREDICTION_LIMIT):
        assert limiter.record_prediction_view(user_id, uuid4()) is True

    assert limiter.has_exceeded_daily_limit(user_id) is True
    assert limiter.record_prediction_view(user_id, uuid4()) is False


def _seed_scheduled_games_with_predictions(
    db, test_teams, count: int, *, on_date: tuple[int, int, int] = (2032, 1, 10)
) -> None:
    year, month, day = on_date
    for i in range(count):
        g = Game(
            id=uuid4(),
            league="nfl",
            home_team_id=test_teams[0].id,
            away_team_id=test_teams[1].id,
            scheduled_time=datetime(year, month, day, 10 + (i % 12), 0, tzinfo=timezone.utc),
            status="scheduled",
        )
        db.add(g)
        db.flush()
        db.add(
            Prediction(
                id=uuid4(),
                game_id=g.id,
                model_version="v1.0.0",
                home_win_probability=0.55,
                away_win_probability=0.45,
                expected_home_score=24.0,
                expected_away_score=20.0,
                confidence_level="medium",
                created_at=datetime.now(timezone.utc),
            )
        )
    db.commit()


def test_upcoming_games_consumes_free_tier_quota(client, auth_headers, db, test_teams):
    _seed_scheduled_games_with_predictions(
        db, test_teams, FREE_TIER_DAILY_PREDICTION_LIMIT + 2
    )

    r = client.get("/api/v1/games/upcoming?league=nfl&limit=50", headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    with_pred = [g for g in r.json()["games"] if g.get("prediction")]
    assert len(with_pred) == FREE_TIER_DAILY_PREDICTION_LIMIT


def test_feed_top_picks_consumes_free_tier_quota(client, auth_headers, db, test_teams):
    _seed_scheduled_games_with_predictions(
        db,
        test_teams,
        FREE_TIER_DAILY_PREDICTION_LIMIT + 2,
        on_date=(2032, 1, 15),
    )

    r = client.get(
        "/api/v1/feed/top-picks",
        params={"league": "nfl", "limit": 50, "date": "2032-01-15", "time_zone": "UTC"},
        headers=auth_headers,
    )
    assert r.status_code == status.HTTP_200_OK
    with_pred = [p for p in r.json()["picks"] if p.get("prediction")]
    assert len(with_pred) == FREE_TIER_DAILY_PREDICTION_LIMIT


def test_get_game_detail_records_free_tier_view(client, auth_headers, test_game, test_prediction, db):
    user = db.query(User).filter(User.email == "test@example.com").first()
    limiter = FreeTierPredictionLimiter()

    r = client.get(f"/api/v1/games/{test_game.id}", headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    assert r.json().get("prediction") is not None
    assert limiter.get_view_count(user.id) == 1

    r2 = client.get(f"/api/v1/games/{test_game.id}", headers=auth_headers)
    assert r2.status_code == status.HTTP_200_OK
    assert r2.json().get("prediction") is not None
    assert limiter.get_view_count(user.id) == 1


def test_explanation_records_free_tier_view(client, auth_headers, test_game, test_prediction, db):
    user = db.query(User).filter(User.email == "test@example.com").first()
    limiter = FreeTierPredictionLimiter()

    r = client.get(f"/api/v1/games/{test_game.id}/explanation", headers=auth_headers)
    assert r.status_code == status.HTTP_200_OK
    assert limiter.get_view_count(user.id) == 1


def test_get_prediction_exceeds_daily_limit_still_blocks(client, auth_headers, test_game, test_prediction, db):
    user = db.query(User).filter(User.email == "test@example.com").first()
    limiter = FreeTierPredictionLimiter()
    for _ in range(FREE_TIER_DAILY_PREDICTION_LIMIT):
        limiter.record_prediction_view(user.id, uuid4())

    response = client.get(
        f"/api/v1/games/{test_game.id}/predictions",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "limit" in response.json()["detail"].lower()


def test_share_pick_blocks_confidence_when_free_tier_exhausted(
    client, auth_headers, test_game, test_prediction, db
):
    user = db.query(User).filter(User.email == "test@example.com").first()
    limiter = FreeTierPredictionLimiter()
    for _ in range(FREE_TIER_DAILY_PREDICTION_LIMIT):
        limiter.record_prediction_view(user.id, uuid4())

    response = client.post(
        f"/api/v1/games/{test_game.id}/share",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "limit" in response.json()["detail"].lower()


def test_share_pick_omits_confidence_for_guests(client, test_game, test_prediction):
    response = client.post(f"/api/v1/games/{test_game.id}/share")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert "confidence" not in body["message"].lower()
    assert body.get("image_base64") is not None


def test_share_pick_includes_confidence_when_free_tier_allows(
    client, auth_headers, test_game, test_prediction, db
):
    response = client.post(
        f"/api/v1/games/{test_game.id}/share",
        headers=auth_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert "confidence" in response.json()["message"].lower()

    user = db.query(User).filter(User.email == "test@example.com").first()
    limiter = FreeTierPredictionLimiter()
    assert limiter.get_view_count(user.id) == 1
