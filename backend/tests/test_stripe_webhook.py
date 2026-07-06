"""Stripe webhook idempotency and tier updates."""
import json

import pytest
from app.config import get_settings

WEBHOOK = "/api/v1/subscription/webhook"


def _checkout_completed_event(user_id, *, event_id="evt_test_checkout_1"):
    return {
        "id": event_id,
        "type": "checkout.session.completed",
        "data": {
            "object": {
                "id": "cs_test_1",
                "client_reference_id": str(user_id),
                "metadata": {"subscription_tier": "premium"},
            }
        },
    }


@pytest.fixture
def stripe_webhook_settings(monkeypatch):
    monkeypatch.setenv("STRIPE_WEBHOOK_SECRET", "whsec_test_secret")
    monkeypatch.setenv("STRIPE_SECRET_KEY", "sk_test_secret")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def _post_stripe_webhook(client, monkeypatch, event_dict):
    import stripe

    def _construct_event(body, signature, secret):
        assert secret == "whsec_test_secret"
        return event_dict

    monkeypatch.setattr(stripe.Webhook, "construct_event", _construct_event)
    return client.post(
        WEBHOOK,
        data=json.dumps(event_dict),
        headers={"Stripe-Signature": "t=1,v1=test"},
    )


def test_stripe_webhook_checkout_grants_premium(
    client, db, test_user, monkeypatch, stripe_webhook_settings
):
    assert test_user.subscription_tier == "free"
    r = _post_stripe_webhook(
        client,
        monkeypatch,
        _checkout_completed_event(test_user.id),
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"received": True}
    db.refresh(test_user)
    assert test_user.subscription_tier == "premium"


def test_stripe_webhook_duplicate_event_is_idempotent(
    client, db, test_user, monkeypatch, stripe_webhook_settings
):
    event = _checkout_completed_event(test_user.id, event_id="evt_dup_1")
    r1 = _post_stripe_webhook(client, monkeypatch, event)
    assert r1.status_code == 200
    db.refresh(test_user)
    assert test_user.subscription_tier == "premium"

    test_user.subscription_tier = "free"
    db.commit()

    r2 = _post_stripe_webhook(client, monkeypatch, event)
    assert r2.status_code == 200
    assert r2.json() == {"received": True, "duplicate": True}
    db.refresh(test_user)
    assert test_user.subscription_tier == "free"


def test_stripe_webhook_rejects_invalid_signature(client, monkeypatch, stripe_webhook_settings):
    import stripe

    def _bad_sig(body, signature, secret):
        raise stripe.error.SignatureVerificationError("bad sig", sig_header=signature)

    monkeypatch.setattr(stripe.Webhook, "construct_event", _bad_sig)
    r = client.post(
        WEBHOOK,
        data=b"{}",
        headers={"Stripe-Signature": "bad"},
    )
    assert r.status_code == 400
