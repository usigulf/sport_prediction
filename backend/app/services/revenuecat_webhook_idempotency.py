"""Idempotent RevenueCat webhook delivery handling."""
from __future__ import annotations

import logging

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.revenuecat_webhook_event import RevenueCatWebhookEvent

logger = logging.getLogger(__name__)


def claim_revenuecat_webhook_event(db: Session, event_id: str, event_type: str) -> bool:
    """
    Reserve a RevenueCat event id before mutating subscription state.

    Returns True when this delivery should be processed; False when the event id
    was already recorded (safe duplicate retry).
    """
    eid = (event_id or "").strip()
    if not eid:
        logger.warning("RevenueCat webhook missing event id — skipping dedupe claim")
        return True

    row = RevenueCatWebhookEvent(
        revenuecat_event_id=eid,
        event_type=(event_type or "unknown")[:120],
    )
    db.add(row)
    try:
        db.flush()
        return True
    except IntegrityError:
        db.rollback()
        logger.info(
            "RevenueCat webhook duplicate event skipped",
            extra={"event_id": eid, "event_type": event_type},
        )
        return False
