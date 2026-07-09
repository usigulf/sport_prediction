"""
Phase 3 audit: privacy, search, config flags, billing portal, job queue, trial push.
"""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

import pytest
from fastapi import status

from app.core.security import get_password_hash
from app.models.team import Team
from app.models.game import Game
from app.models.user import User
from app.models.user_favorite import UserFavorite
from app.models.user_push_token import UserPushToken


def _auth_headers(client, email, password):
    r = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_gdpr_export(client, test_user):
    headers = _auth_headers(client, test_user.email, "testpass123")
    r = client.get("/api/v1/user/me/export", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["user"]["email"] == test_user.email
    assert "favorites" in data
    assert "format_version" in data


def test_ccpa_opt_out(client, test_user, db):
    headers = _auth_headers(client, test_user.email, "testpass123")
    r = client.post("/api/v1/user/me/privacy/ccpa-opt-out", headers=headers)
    assert r.status_code == 200
    db.refresh(test_user)
    assert test_user.ccpa_opt_out_at is not None


def test_referral_apply(client, db, test_user):
    referrer = User(
        email="ref@example.com",
        password_hash=get_password_hash("ref123"),
        subscription_tier="free",
    )
    db.add(referrer)
    db.commit()
    headers = _auth_headers(client, test_user.email, "testpass123")
    r = client.post(
        "/api/v1/user/referral/apply",
        json={"referral_code": str(referrer.id)},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["applied"] is True


def test_game_search_by_team_name(client, db, test_game, test_teams):
    test_teams[0].name = "UniqueSearchable FC"
    db.commit()
    r = client.get("/api/v1/games/search", params={"q": "UniqueSearchable"})
    assert r.status_code == 200
    games = r.json()["games"]
    assert any(g["id"] == str(test_game.id) for g in games)


def test_feature_flags_endpoint(client):
    r = client.get("/api/v1/config/feature-flags")
    assert r.status_code == 200
    flags = r.json()["flags"]
    assert "odds_display" in flags
    assert "experiments" in flags
    assert "intro_offer_variant" in flags["experiments"]


def test_billing_portal_requires_stripe_customer(client, test_user):
    headers = _auth_headers(client, test_user.email, "testpass123")
    r = client.post("/api/v1/subscription/billing-portal", headers=headers)
    assert r.status_code in (404, 503)


@patch("app.api.v1.subscription.stripe")
def test_billing_portal_returns_url(mock_stripe, client, test_user, db):
    test_user.stripe_customer_id = "cus_test123"
    db.commit()
    mock_stripe.billing_portal.Session.create.return_value = type(
        "S", (), {"url": "https://billing.stripe.test"}
    )()
    headers = _auth_headers(client, test_user.email, "testpass123")
    with patch("app.api.v1.subscription.settings") as ms:
        ms.stripe_secret_key = "sk_test"
        ms.stripe_success_url = "https://octobetiq.com/subscriber-portal.html"
        with patch("app.api.v1.subscription.stripe", mock_stripe):
            r = client.post("/api/v1/subscription/billing-portal", headers=headers)
    assert r.status_code == 200
    assert "billing.stripe.test" in r.json()["url"]


def test_job_queue_enqueue_and_dequeue():
    from app.services.job_queue_service import enqueue_job, dequeue_job, get_job

    job_id = enqueue_job("test_job", {"x": 1})
    assert job_id
    job = dequeue_job()
    assert job is not None
    assert job["type"] == "test_job"
    stored = get_job(job_id)
    assert stored["status"] == "processing"


@patch("app.services.push_trigger_service.send_expo_push")
def test_trial_ending_reminders(mock_push, db):
    from app.services.push_trigger_service import send_trial_ending_reminders

    user = User(
        email="trial@example.com",
        password_hash=get_password_hash("trial123"),
        subscription_tier="premium",
        subscription_trial_end_at=datetime.now(timezone.utc) + timedelta(hours=12),
    )
    db.add(user)
    db.commit()
    db.add(UserPushToken(user_id=user.id, token="ExponentPushToken[test]", platform="ios"))
    db.commit()
    sent = send_trial_ending_reminders(db)
    assert sent == 1
    mock_push.assert_called_once()



def test_websocket_connection_limit():
    import asyncio
    from app.services.live_websocket_hub import LiveWebSocketHub, WebSocketConnectionLimitError
    from app.config import get_settings

    async def _run():
        hub = LiveWebSocketHub()
        with patch.object(get_settings(), "websocket_max_connections_per_game", 1):
            q1 = await hub.subscribe("game-a")
            with pytest.raises(WebSocketConnectionLimitError):
                await hub.subscribe("game-a")
            await hub.unsubscribe("game-a", q1)

    asyncio.get_event_loop().run_until_complete(_run())


def test_openapi_disabled_in_production_validator(monkeypatch):
    from app.config import Settings

    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.setenv("JWT_SECRET", "x" * 40)
    monkeypatch.setenv("REDIS_URL", "redis://localhost:6379/0")
    monkeypatch.setenv("REDIS_PASSWORD", "x" * 20)
    monkeypatch.delenv("OPENAPI_DOCS_ENABLED", raising=False)
    s = Settings()
    assert s.openapi_docs_enabled is False
