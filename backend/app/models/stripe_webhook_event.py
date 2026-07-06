"""Recorded Stripe webhook event IDs for idempotent processing."""
from sqlalchemy import Column, DateTime, String, UniqueConstraint
from sqlalchemy.sql import func
import uuid

from app.database import Base, GUID


class StripeWebhookEvent(Base):
    __tablename__ = "stripe_webhook_events"

    id = Column(GUID, primary_key=True, default=uuid.uuid4)
    stripe_event_id = Column(String(255), nullable=False)
    event_type = Column(String(120), nullable=False)
    received_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("stripe_event_id", name="uq_stripe_webhook_event_id"),
    )
