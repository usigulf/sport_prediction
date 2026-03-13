"""
Stripe subscription: create checkout session, webhook to set subscription_tier.
Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PREMIUM (and STRIPE_WEBHOOK_SECRET for webhook) in env.
"""
try:
    import stripe
except ImportError:
    stripe = None

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.config import get_settings

router = APIRouter(prefix="/subscription", tags=["subscription"])
settings = get_settings()


@router.post("/create-checkout")
async def create_checkout_session(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a Stripe Checkout Session for Premium subscription (7-day trial).
    Returns { url } to redirect the user to Stripe Checkout.
    """
    if stripe is None:
        raise HTTPException(status_code=503, detail="Stripe not installed. pip install stripe")
    if not settings.stripe_secret_key or not settings.stripe_price_id_premium:
        raise HTTPException(
            status_code=503,
            detail="Payments not configured. Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID_PREMIUM.",
        )
    stripe.api_key = settings.stripe_secret_key
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            client_reference_id=str(current_user.id),
            customer_email=current_user.email,
            line_items=[
                {
                    "price": settings.stripe_price_id_premium,
                    "quantity": 1,
                }
            ],
            subscription_data={
                "trial_period_days": 7,
            },
            success_url=settings.stripe_success_url + "?session_id={CHECKOUT_SESSION_ID}",
            cancel_url=settings.stripe_cancel_url,
        )
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
    Stripe webhook: on checkout.session.completed, set user subscription_tier to premium.
    Configure this URL in Stripe Dashboard (e.g. https://api.yourapp.com/api/v1/subscription/webhook).
    """
    if stripe is None:
        raise HTTPException(status_code=503, detail="Stripe not installed")
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook secret not configured")
    body = await request.body()
    try:
        event = stripe.Webhook.construct_event(
            body, stripe_signature or "", settings.stripe_webhook_secret
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("client_reference_id")
        if user_id:
            try:
                from uuid import UUID
                uid = UUID(user_id) if isinstance(user_id, str) else user_id
            except (ValueError, TypeError):
                uid = user_id
            user = db.query(User).filter(User.id == uid).first()
            if user:
                user.subscription_tier = "premium"
                db.commit()
    return {"received": True}
