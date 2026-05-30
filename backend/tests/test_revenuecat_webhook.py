"""RevenueCat webhook: entitlement events keep subscription_tier in sync."""
from app.config import get_settings

WEBHOOK = "/api/v1/subscription/revenuecat/webhook"


def _event(type_: str, user_id, entitlements):
    return {
        "event": {
            "type": type_,
            "app_user_id": str(user_id),
            "entitlement_ids": entitlements,
        }
    }


def test_revenuecat_webhook_grants_pro_then_expires(client, db, test_user, monkeypatch):
    monkeypatch.setenv("REVENUECAT_WEBHOOK_AUTH", "secret-rc")
    get_settings.cache_clear()
    try:
        r = client.post(
            WEBHOOK,
            headers={"Authorization": "secret-rc"},
            json=_event("INITIAL_PURCHASE", test_user.id, ["pro"]),
        )
        assert r.status_code == 200, r.text
        db.refresh(test_user)
        assert test_user.subscription_tier == "premium_plus"

        r = client.post(
            WEBHOOK,
            headers={"Authorization": "secret-rc"},
            json=_event("EXPIRATION", test_user.id, ["pro"]),
        )
        assert r.status_code == 200, r.text
        db.refresh(test_user)
        assert test_user.subscription_tier == "free"
    finally:
        get_settings.cache_clear()


def test_revenuecat_webhook_grants_premium(client, db, test_user, monkeypatch):
    monkeypatch.setenv("REVENUECAT_WEBHOOK_AUTH", "secret-rc")
    get_settings.cache_clear()
    try:
        r = client.post(
            WEBHOOK,
            headers={"Authorization": "secret-rc"},
            json=_event("RENEWAL", test_user.id, ["premium"]),
        )
        assert r.status_code == 200, r.text
        db.refresh(test_user)
        assert test_user.subscription_tier == "premium"
    finally:
        get_settings.cache_clear()


def test_revenuecat_webhook_cancellation_keeps_access(client, db, premium_user, monkeypatch):
    """CANCELLATION (auto-renew off) must not revoke access until EXPIRATION."""
    monkeypatch.setenv("REVENUECAT_WEBHOOK_AUTH", "secret-rc")
    get_settings.cache_clear()
    try:
        r = client.post(
            WEBHOOK,
            headers={"Authorization": "secret-rc"},
            json=_event("CANCELLATION", premium_user.id, ["premium"]),
        )
        assert r.status_code == 200, r.text
        db.refresh(premium_user)
        assert premium_user.subscription_tier == "premium"
    finally:
        get_settings.cache_clear()


def test_revenuecat_webhook_rejects_bad_auth(client, test_user, monkeypatch):
    monkeypatch.setenv("REVENUECAT_WEBHOOK_AUTH", "secret-rc")
    get_settings.cache_clear()
    try:
        r = client.post(
            WEBHOOK,
            headers={"Authorization": "wrong"},
            json=_event("INITIAL_PURCHASE", test_user.id, ["pro"]),
        )
        assert r.status_code == 401
    finally:
        get_settings.cache_clear()


def test_revenuecat_webhook_503_when_unconfigured(client, test_user, monkeypatch):
    monkeypatch.delenv("REVENUECAT_WEBHOOK_AUTH", raising=False)
    get_settings.cache_clear()
    try:
        r = client.post(
            WEBHOOK,
            headers={"Authorization": "anything"},
            json=_event("INITIAL_PURCHASE", test_user.id, ["pro"]),
        )
        assert r.status_code == 503
    finally:
        get_settings.cache_clear()
