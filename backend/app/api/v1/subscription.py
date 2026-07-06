"""
Stripe subscription: create checkout session, webhook to set subscription_tier.

Env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PREMIUM, STRIPE_PRICE_ID_PREMIUM_PLUS (Pro), STRIPE_WEBHOOK_SECRET.

Stripe Dashboard → Webhooks → endpoint URL (public HTTPS):
  POST {API_ORIGIN}/api/v1/subscription/webhook
Events: checkout.session.completed, customer.subscription.updated,
  customer.subscription.deleted
"""
from __future__ import annotations
import logging
import secrets

try:
    import stripe
except ImportError:
    stripe = None

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Literal, Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.config import get_settings
from app.services.stripe_webhook_idempotency import claim_stripe_webhook_event
from app.services.revenuecat_webhook_idempotency import claim_revenuecat_webhook_event
from app.utils.sentry_alerts import report_webhook_issue

router = APIRouter(prefix="/subscription", tags=["subscription"])
settings = get_settings()
logger = logging.getLogger(__name__)


class CreateCheckoutBody(BaseModel):
    """Maps to app tiers: premium → Premium, premium_plus → Pro."""

    tier: Literal["premium", "premium_plus"] = Field(
        default="premium",
        description="Stripe price: premium or premium_plus (Pro)",
    )


def _price_id_for_tier(tier: str) -> str | None:
    if tier == "premium_plus":
        return settings.stripe_price_id_premium_plus
    return settings.stripe_price_id_premium


def _db_tier_from_checkout_metadata(session: dict) -> str:
    meta = session.get("metadata") or {}
    t = meta.get("subscription_tier")
    if t in ("premium", "premium_plus"):
        return t
    return "premium"


_SUBSCRIPTION_GRANT_STATUSES = frozenset({"active", "trialing"})


def _tier_from_stripe_subscription(sub: dict, settings_obj) -> str | None:
    meta = sub.get("metadata") or {}
    t = meta.get("subscription_tier")
    if t in ("premium", "premium_plus"):
        return t
    items = (sub.get("items") or {}).get("data") or []
    for item in items:
        price = _as_plain_dict(item.get("price") if isinstance(item, dict) else getattr(item, "price", None))
        pid = price.get("id")
        if pid and pid == settings_obj.stripe_price_id_premium_plus:
            return "premium_plus"
        if pid and pid == settings_obj.stripe_price_id_premium:
            return "premium"
    return None


def _user_id_from_stripe_metadata(meta: dict) -> str | None:
    uid = meta.get("user_id")
    return str(uid) if uid else None


def _apply_stripe_subscription_lifecycle(
    db: Session,
    *,
    user: User,
    subscription: dict,
    settings_obj,
    event_id: str,
    event_type: str,
) -> None:
    status = str(subscription.get("status") or "").lower()
    if status in _SUBSCRIPTION_GRANT_STATUSES:
        tier = _tier_from_stripe_subscription(subscription, settings_obj)
        if tier:
            user.subscription_tier = tier
            db.commit()
            logger.info(
                "Stripe subscription active",
                extra={"event_id": event_id, "event_type": event_type, "user_id": str(user.id), "tier": tier},
            )
        return
    if status in ("canceled", "unpaid", "incomplete_expired"):
        user.subscription_tier = "free"
        db.commit()
        logger.info(
            "Stripe subscription ended — tier set to free",
            extra={"event_id": event_id, "event_type": event_type, "user_id": str(user.id), "status": status},
        )


def _as_plain_dict(obj) -> dict:
    """Convert Stripe SDK objects into plain dicts for safe .get() access."""
    if isinstance(obj, dict):
        return obj
    to_dict = getattr(obj, "to_dict_recursive", None)
    if callable(to_dict):
        try:
            out = to_dict()
            return out if isinstance(out, dict) else {}
        except Exception:
            return {}
    return {}


@router.post("/create-checkout")
async def create_checkout_session(
    body: CreateCheckoutBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a Stripe Checkout Session for Premium or Pro (premium_plus).
    Premium includes a 7-day trial in code; Pro has no trial here (set trials on the Price in Stripe if needed).
    Returns { url } to open in Stripe Checkout.
    """
    if stripe is None:
        raise HTTPException(status_code=503, detail="Stripe not installed. pip install stripe")
    price_id = _price_id_for_tier(body.tier)
    if not settings.stripe_secret_key or not price_id:
        raise HTTPException(
            status_code=503,
            detail=(
                "Payments not configured. Set STRIPE_SECRET_KEY and "
                f"STRIPE_PRICE_ID_{'PREMIUM_PLUS' if body.tier == 'premium_plus' else 'PREMIUM'}."
            ),
        )
    stripe.api_key = settings.stripe_secret_key
    create_kwargs: dict = {
        "mode": "subscription",
        "client_reference_id": str(current_user.id),
        "customer_email": current_user.email,
        "line_items": [{"price": price_id, "quantity": 1}],
        "metadata": {"subscription_tier": body.tier},
        "success_url": settings.stripe_success_url + "?session_id={CHECKOUT_SESSION_ID}",
        "cancel_url": settings.stripe_cancel_url,
    }
    sub_meta = {
        "user_id": str(current_user.id),
        "subscription_tier": body.tier,
    }
    create_kwargs["subscription_data"] = {"metadata": sub_meta}
    if body.tier == "premium":
        create_kwargs["subscription_data"]["trial_period_days"] = 7
    try:
        session = stripe.checkout.Session.create(**create_kwargs)
        return {"url": session.url}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_db),
):
    """
    Stripe webhook: on checkout.session.completed, set user subscription_tier from session metadata.
    Register POST /api/v1/subscription/webhook in Stripe (HTTPS origin where this API is exposed).
    """
    req_settings = get_settings()
    if stripe is None:
        raise HTTPException(status_code=503, detail="Stripe not installed")
    if not req_settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            body, stripe_signature or "", req_settings.stripe_webhook_secret
        )
    except ValueError:
        report_webhook_issue("Stripe webhook invalid payload", level="error")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        report_webhook_issue("Stripe webhook signature verification failed", level="error")
        raise HTTPException(status_code=400, detail="Invalid signature")
    event_data = _as_plain_dict(event)
    event_id = event_data.get("id", "unknown")
    event_type = event_data.get("type", "unknown")
    logger.info("Stripe webhook received", extra={"event_id": event_id, "event_type": event_type})
    if not claim_stripe_webhook_event(db, event_id, event_type):
        return {"received": True, "duplicate": True}
    if event_type == "checkout.session.completed":
        session_obj = _as_plain_dict((event_data.get("data") or {}).get("object"))
        # Thin webhook payloads may omit fields; fetch full session when needed.
        sid = session_obj.get("id")
        if (
            req_settings.stripe_secret_key
            and sid
            and (
                not session_obj.get("client_reference_id")
                or not (session_obj.get("metadata") or {}).get("subscription_tier")
            )
        ):
            stripe.api_key = req_settings.stripe_secret_key
            session_obj = _as_plain_dict(stripe.checkout.Session.retrieve(sid))
        user_id = session_obj.get("client_reference_id")
        db_tier = _db_tier_from_checkout_metadata(session_obj)
        if user_id:
            try:
                from uuid import UUID

                uid = UUID(user_id) if isinstance(user_id, str) else user_id
            except (ValueError, TypeError):
                uid = user_id
            user = db.query(User).filter(User.id == uid).first()
            if user:
                user.subscription_tier = db_tier
                db.commit()
                logger.info(
                    "Updated user subscription tier from Stripe webhook",
                    extra={"event_id": event_id, "user_id": str(user.id), "tier": db_tier},
                )
            else:
                report_webhook_issue(
                    "Stripe webhook user not found",
                    event_id=event_id,
                    client_reference_id=str(user_id),
                )
        else:
            report_webhook_issue(
                "Stripe checkout.session.completed missing client_reference_id",
                event_id=event_id,
            )
    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        sub_obj = _as_plain_dict((event_data.get("data") or {}).get("object"))
        meta = sub_obj.get("metadata") or {}
        user_id = _user_id_from_stripe_metadata(meta)
        if not user_id:
            report_webhook_issue(
                "Stripe subscription event missing user_id metadata",
                event_id=event_id,
                event_type=event_type,
            )
            return {"received": True}
        try:
            from uuid import UUID

            uid = UUID(user_id)
        except (ValueError, TypeError):
            uid = user_id
        user = db.query(User).filter(User.id == uid).first()
        if not user:
            report_webhook_issue(
                "Stripe subscription event user not found",
                event_id=event_id,
                user_id=str(user_id),
            )
            return {"received": True}
        if event_type == "customer.subscription.deleted":
            user.subscription_tier = "free"
            db.commit()
            logger.info(
                "Stripe subscription deleted",
                extra={"event_id": event_id, "user_id": str(user.id)},
            )
        else:
            _apply_stripe_subscription_lifecycle(
                db,
                user=user,
                subscription=sub_obj,
                settings_obj=req_settings,
                event_id=event_id,
                event_type=event_type,
            )
    else:
        logger.info("Stripe webhook ignored event type", extra={"event_id": event_id, "event_type": event_type})
    return {"received": True}


# Events that grant/refresh access (derive tier from entitlement_ids).
_RC_GRANTING_EVENTS = frozenset(
    {
        "INITIAL_PURCHASE",
        "RENEWAL",
        "UNCANCELLATION",
        "PRODUCT_CHANGE",
        "NON_RENEWING_PURCHASE",
        "SUBSCRIPTION_EXTENDED",
    }
)
# Events that revoke access. CANCELLATION is intentionally excluded — the user
# keeps access until the period ends (EXPIRATION fires then).
_RC_REVOKING_EVENTS = frozenset({"EXPIRATION"})


def _rc_tier_from_entitlements(entitlement_ids: list, settings_obj) -> str | None:
    """
    Map RevenueCat entitlement_ids to backend subscription_tier.

    Returns None when entitlements are missing or unrecognized so granting events
    do not over-grant premium access (P2-006).
    """
    ids = {str(e).lower() for e in (entitlement_ids or []) if e}
    if not ids:
        return None
    if settings_obj.revenuecat_entitlement_pro.lower() in ids:
        return "premium_plus"
    if settings_obj.revenuecat_entitlement_premium.lower() in ids:
        return "premium"
    return None


@router.post("/revenuecat/webhook")
async def revenuecat_webhook(
    request: Request,
    authorization: Optional[str] = Header(None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    """
    RevenueCat webhook: keep `subscription_tier` in sync with store entitlements.
    Configure in RevenueCat dashboard with the same Authorization header value as
    REVENUECAT_WEBHOOK_AUTH. The app sets RevenueCat `app_user_id` to the backend
    user id, so events map directly to a user.
    """
    req_settings = get_settings()
    expected = req_settings.revenuecat_webhook_auth
    if not expected:
        raise HTTPException(status_code=503, detail="RevenueCat webhook not configured")
    if not authorization or not secrets.compare_digest(authorization, expected):
        report_webhook_issue("RevenueCat webhook auth failed", level="error")
        raise HTTPException(status_code=401, detail="Invalid authorization")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid payload")

    event = (payload or {}).get("event") or {}
    event_type = str(event.get("type") or "").upper()
    app_user_id = event.get("app_user_id")
    entitlement_ids = event.get("entitlement_ids")
    if entitlement_ids is None and event.get("entitlement_id"):
        entitlement_ids = [event.get("entitlement_id")]

    if event_type in _RC_REVOKING_EVENTS:
        new_tier = "free"
    elif event_type in _RC_GRANTING_EVENTS:
        new_tier = _rc_tier_from_entitlements(entitlement_ids or [], req_settings)
        if new_tier is None:
            report_webhook_issue(
                "RevenueCat granting event ignored — no recognized entitlement",
                event_type=event_type,
                entitlement_ids=entitlement_ids,
            )
            return {"received": True, "ignored": True, "reason": "unrecognized_entitlement"}
    else:
        logger.info("RevenueCat webhook ignored event type", extra={"event_type": event_type})
        return {"received": True, "ignored": True}

    if not app_user_id:
        report_webhook_issue(
            "RevenueCat webhook missing app_user_id",
            event_type=event_type,
        )
        return {"received": True}

    try:
        from uuid import UUID

        uid = UUID(str(app_user_id))
    except (ValueError, TypeError):
        uid = app_user_id
    user = db.query(User).filter(User.id == uid).first()
    if not user:
        report_webhook_issue(
            "RevenueCat webhook user not found",
            event_type=event_type,
            app_user_id=str(app_user_id),
        )
        return {"received": True}

    event_id = str(event.get("id") or "").strip()
    if not claim_revenuecat_webhook_event(db, event_id, event_type):
        return {"received": True, "duplicate": True}

    user.subscription_tier = new_tier
    db.commit()
    logger.info(
        "Updated user subscription tier from RevenueCat webhook",
        extra={"event_type": event_type, "user_id": str(user.id), "tier": new_tier},
    )
    return {"received": True}
