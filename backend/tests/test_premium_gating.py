"""Premium gating and paywall bypass regression suite (I73)."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import status

from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.services.free_tier_limits import FREE_TIER_DAILY_PREDICTION_LIMIT, FreeTierPredictionLimiter


def _seed_games_with_predictions(db, test_teams, count: int) -> None:
    for i in range(count):
        g = Game(
            id=uuid4(),
            league="nfl",
            home_team_id=test_teams[0].id,
            away_team_id=test_teams[1].id,
            scheduled_time=datetime(2032, 2, i + 1, 18, 0, tzinfo=timezone.utc),
            status="scheduled",
        )
        db.add(g)
        db.flush()
        db.add(
            Prediction(
                id=uuid4(),
                game_id=g.id,
                model_version="v1.0.0",
                home_win_probability=0.58,
                away_win_probability=0.42,
                expected_home_score=24.0,
                expected_away_score=20.0,
                confidence_level="medium",
                created_at=datetime.now(timezone.utc),
            )
        )
    db.commit()


def test_unauthenticated_premium_endpoints_require_auth(client, test_game):
    endpoints = [
        f"/api/v1/games/{test_game.id}/player-props",
        f"/api/v1/games/{test_game.id}/live-predictions",
        f"/api/v1/games/{test_game.id}/explanation",
    ]
    for path in endpoints:
        r = client.get(path)
        assert r.status_code == status.HTTP_401_UNAUTHORIZED, path


def test_free_user_blocked_from_player_props(client, auth_headers, test_game):
    r = client.get(f"/api/v1/games/{test_game.id}/player-props", headers=auth_headers)
    assert r.status_code == status.HTTP_403_FORBIDDEN
    assert "premium" in r.json()["detail"].lower()


def test_free_user_blocked_from_live_predictions(client, auth_headers, test_game, db):
    test_game.status = "live"
    db.commit()
    r = client.get(
        f"/api/v1/games/{test_game.id}/live-predictions",
        headers=auth_headers,
    )
    assert r.status_code == status.HTTP_403_FORBIDDEN
    assert "premium" in r.json()["detail"].lower()


def test_premium_user_unlimited_prediction_views(
    client, premium_auth_headers, db, test_teams, test_game, test_prediction
):
    """Premium users are not capped by the free-tier daily prediction view limit."""
    _seed_games_with_predictions(db, test_teams, FREE_TIER_DAILY_PREDICTION_LIMIT + 3)

    r = client.get("/api/v1/games/upcoming?league=nfl&limit=50", headers=premium_auth_headers)
    assert r.status_code == status.HTTP_200_OK
    with_pred = [g for g in r.json()["games"] if g.get("prediction")]
    assert len(with_pred) > FREE_TIER_DAILY_PREDICTION_LIMIT


def test_share_pick_blocked_when_free_tier_quota_exhausted(
    client, auth_headers, test_game, test_prediction, db
):
    user = db.query(User).filter(User.email == "test@example.com").first()
    limiter = FreeTierPredictionLimiter()
    for _ in range(FREE_TIER_DAILY_PREDICTION_LIMIT):
        limiter.record_prediction_view(user.id, uuid4())

    r = client.post(f"/api/v1/games/{test_game.id}/share", headers=auth_headers)
    assert r.status_code == status.HTTP_403_FORBIDDEN
    assert "limit" in r.json()["detail"].lower()


def test_premium_user_share_pick_includes_confidence(
    client, premium_auth_headers, test_game, test_prediction
):
    r = client.post(
        f"/api/v1/games/{test_game.id}/share",
        headers=premium_auth_headers,
    )
    assert r.status_code == status.HTTP_200_OK
    assert "confidence" in r.json()["message"].lower()
