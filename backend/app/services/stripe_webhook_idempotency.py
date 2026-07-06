"""Idempotent Stripe webhook delivery handling."""
from __future__ import annotations

import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.stripe_webhook_event import StripeWebhookEvent

logger = logging.getLogger(__name__)


def claim_stripe_webhook_event(db: Session, event_id: str, event_type: str) -> bool:
    """
    Reserve a Stripe event id before processing.

    Returns True when this delivery should be processed; False when the event id
    was already recorded (safe duplicate retry).
    """
    eid = (event_id or "").strip()
    if not eid or eid == "unknown":
        logger.warning("Stripe webhook missing event id — skipping dedupe claim")
        return True

    row = StripeWebhookEvent(
        stripe_event_id=eid,
        event_type=(event_type or "unknown")[:120],
    )
    db.add(row)
    try:
        db.flush()
        return True
    except IntegrityError:
        db.rollback()
        logger.info(
            "Stripe webhook duplicate event skipped",
            extra={"event_id": eid, "event_type": event_type},
        )
        return False
