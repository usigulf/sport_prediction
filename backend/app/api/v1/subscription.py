"""
Stripe subscription: create checkout session, webhook to set subscription_tier.

Env: STRIPE_SECRET_KEY, STRIPE_PRICE_ID_PREMIUM, STRIPE_PRICE_ID_PREMIUM_PLUS (Pro), STRIPE_WEBHOOK_SECRET.

Stripe Dashboard → Webhooks → endpoint URL (public HTTPS):
  POST {API_ORIGIN}/api/v1/subscription/webhook
Event: checkout.session.completed
"""
from __future__ import annotations
import logging

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
    if body.tier == "premium":
        create_kwargs["subscription_data"] = {"trial_period_days": 7}
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
        logger.warning("Stripe webhook invalid payload")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        logger.warning("Stripe webhook signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid signature")
    event_id = event.get("id", "unknown")
    event_type = event.get("type", "unknown")
    logger.info("Stripe webhook received", extra={"event_id": event_id, "event_type": event_type})
    if event["type"] == "checkout.session.completed":
        session_obj = event["data"]["object"]
        # Thin webhook payloads may omit fields; fetch full session when needed.
        sid = session_obj.get("id") if isinstance(session_obj, dict) else None
        if (
            req_settings.stripe_secret_key
            and sid
            and (
                not session_obj.get("client_reference_id")
                or not (session_obj.get("metadata") or {}).get("subscription_tier")
            )
        ):
            stripe.api_key = req_settings.stripe_secret_key
            session_obj = stripe.checkout.Session.retrieve(sid)
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
                logger.warning(
                    "Stripe webhook user not found",
                    extra={"event_id": event_id, "client_reference_id": str(user_id)},
                )
        else:
            logger.warning(
                "Stripe checkout.session.completed missing client_reference_id",
                extra={"event_id": event_id},
            )
    else:
        logger.info("Stripe webhook ignored event type", extra={"event_id": event_id, "event_type": event_type})
    return {"received": True}
