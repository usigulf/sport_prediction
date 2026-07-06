"""Cancel Stripe / RevenueCat billing when a user deletes their account."""
from __future__ import annotations

import logging
from typing import Any

import requests

from app.config import Settings

logger = logging.getLogger(__name__)

_RC_API_BASE = "https://api.revenuecat.com/v1"

try:
    import stripe
except ImportError:
    stripe = None

_CANCELABLE_STRIPE_STATUSES = frozenset(
    {"active", "trialing", "past_due", "unpaid", "paused"}
)


def _stripe_subscriptions_for_user(user_id: str) -> list[dict[str, Any]]:
    if stripe is None:
        return []
    query = f'metadata["user_id"]:"{user_id}"'
    try:
        result = stripe.Subscription.search(query=query, limit=100)
    except Exception as exc:
        logger.warning(
            "Stripe subscription search failed",
            extra={"user_id": user_id, "error": str(exc)},
        )
        return []
    data = getattr(result, "data", None)
    if data is None and isinstance(result, dict):
        data = result.get("data")
    return list(data or [])


def cancel_stripe_subscriptions_for_user(user_id: str, settings: Settings) -> int:
    """Cancel active Stripe subscriptions tagged with metadata user_id. Returns count cancelled."""
    secret = (settings.stripe_secret_key or "").strip()
    if not secret or stripe is None:
        return 0

    stripe.api_key = secret
    cancelled = 0
    for sub in _stripe_subscriptions_for_user(user_id):
        sub_id = sub.get("id") if isinstance(sub, dict) else getattr(sub, "id", None)
        status = str(
            (sub.get("status") if isinstance(sub, dict) else getattr(sub, "status", "")) or ""
        ).lower()
        if not sub_id or status not in _CANCELABLE_STRIPE_STATUSES:
            continue
        try:
            stripe.Subscription.cancel(sub_id)
            cancelled += 1
            logger.info(
                "Cancelled Stripe subscription on account delete",
                extra={"user_id": user_id, "subscription_id": sub_id},
            )
        except Exception as exc:
            logger.error(
                "Failed to cancel Stripe subscription on account delete",
                extra={"user_id": user_id, "subscription_id": sub_id, "error": str(exc)},
            )
    return cancelled


def delete_revenuecat_subscriber(app_user_id: str, settings: Settings) -> bool:
    """
    Remove the RevenueCat subscriber (store entitlements + subscriber record).
    Requires REVENUECAT_SECRET_API_KEY (project secret key, not webhook auth).
    """
    api_key = (settings.revenuecat_secret_api_key or "").strip()
    if not api_key:
        return False

    url = f"{_RC_API_BASE}/subscribers/{app_user_id}"
    try:
        resp = requests.delete(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=15,
        )
    except requests.RequestException as exc:
        logger.warning(
            "RevenueCat delete subscriber request failed",
            extra={"app_user_id": app_user_id, "error": str(exc)},
        )
        return False

    if resp.status_code in (200, 201, 204, 404):
        logger.info(
            "RevenueCat subscriber removed on account delete",
            extra={"app_user_id": app_user_id, "status_code": resp.status_code},
        )
        return True

    logger.warning(
        "RevenueCat delete subscriber returned unexpected status",
        extra={
            "app_user_id": app_user_id,
            "status_code": resp.status_code,
            "body": (resp.text or "")[:200],
        },
    )
    return False


def cancel_external_subscriptions_for_user(user_id: str, settings: Settings) -> dict[str, Any]:
    """
    Best-effort external billing teardown before local user row is deleted.
    Failures are logged; account deletion should still proceed.
    """
    stripe_cancelled = cancel_stripe_subscriptions_for_user(user_id, settings)
    revenuecat_deleted = delete_revenuecat_subscriber(user_id, settings)
    return {
        "stripe_subscriptions_cancelled": stripe_cancelled,
        "revenuecat_deleted": revenuecat_deleted,
    }
