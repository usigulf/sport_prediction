"""Account delete must cancel Stripe and RevenueCat subscriptions (P1-006)."""
from app.config import get_settings
from app.models.user import User
from app.services import subscription_cancel_service as scs

DELETE_URL = "/api/v1/user/me"


def test_delete_account_removes_user(client, db, test_user, auth_headers):
    user_id = test_user.id
    r = client.delete(DELETE_URL, headers=auth_headers)
    assert r.status_code == 200, r.text
    assert "deleted" in r.json()["message"].lower()
    assert db.query(User).filter(User.id == user_id).first() is None


def test_delete_account_cancels_stripe_subscriptions(client, db, test_user, auth_headers, monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_delete")
    get_settings.cache_clear()
    cancelled: list[str] = []

    class _FakeSearchResult:
        data = [
            {"id": "sub_active", "status": "active"},
            {"id": "sub_canceled", "status": "canceled"},
            {"id": "sub_trial", "status": "trialing"},
        ]

    def _fake_search(*_args, **_kwargs):
        return _FakeSearchResult()

    def _fake_cancel(sub_id):
        cancelled.append(sub_id)
        return {"id": sub_id, "status": "canceled"}

    monkeypatch.setattr(scs.stripe.Subscription, "search", _fake_search)
    monkeypatch.setattr(scs.stripe.Subscription, "cancel", _fake_cancel)

    try:
        r = client.delete(DELETE_URL, headers=auth_headers)
        assert r.status_code == 200
        assert set(cancelled) == {"sub_active", "sub_trial"}
        assert db.query(User).filter(User.id == test_user.id).first() is None
    finally:
        get_settings.cache_clear()


def test_delete_account_deletes_revenuecat_subscriber(client, db, test_user, auth_headers, monkeypatch):
    monkeypatch.setenv("REVENUECAT_SECRET_API_KEY", "sk_rc_test_secret")
    get_settings.cache_clear()
    deleted_urls: list[str] = []

    class _FakeResponse:
        status_code = 200
        text = ""

    def _fake_delete(url, **kwargs):
        deleted_urls.append(url)
        assert kwargs["headers"]["Authorization"] == "Bearer sk_rc_test_secret"
        return _FakeResponse()

    monkeypatch.setattr(scs.requests, "delete", _fake_delete)

    try:
        r = client.delete(DELETE_URL, headers=auth_headers)
        assert r.status_code == 200
        assert deleted_urls == [f"https://api.revenuecat.com/v1/subscribers/{test_user.id}"]
        assert db.query(User).filter(User.id == test_user.id).first() is None
    finally:
        get_settings.cache_clear()


def test_delete_account_succeeds_when_billing_not_configured(client, db, test_user, auth_headers, monkeypatch):
    monkeypatch.delenv("STRIPE_SECRET_KEY", raising=False)
    monkeypatch.delenv("REVENUECAT_SECRET_API_KEY", raising=False)
    get_settings.cache_clear()
    try:
        r = client.delete(DELETE_URL, headers=auth_headers)
        assert r.status_code == 200
        assert db.query(User).filter(User.id == test_user.id).first() is None
    finally:
        get_settings.cache_clear()


def test_cancel_external_subscriptions_returns_counts(monkeypatch):
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test")
    monkeypatch.setenv("REVENUECAT_SECRET_API_KEY", "sk_rc")
    get_settings.cache_clear()

    uid = "550e8400-e29b-41d4-a716-446655440000"

    class _FakeSearchResult:
        data = [{"id": "sub_1", "status": "active"}]

    monkeypatch.setattr(
        scs.stripe.Subscription,
        "search",
        lambda *_a, **_k: _FakeSearchResult(),
    )
    monkeypatch.setattr(
        scs.stripe.Subscription,
        "cancel",
        lambda sub_id: {"id": sub_id},
    )

    class _FakeResponse:
        status_code = 204
        text = ""

    monkeypatch.setattr(scs.requests, "delete", lambda *_a, **_k: _FakeResponse())

    try:
        result = scs.cancel_external_subscriptions_for_user(uid, get_settings())
        assert result == {"stripe_subscriptions_cancelled": 1, "revenuecat_deleted": True}
    finally:
        get_settings.cache_clear()
