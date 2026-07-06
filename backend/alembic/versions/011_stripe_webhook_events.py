"""stripe_webhook_events dedup table for Stripe webhook idempotency (P0-008)."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "011"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "stripe_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stripe_event_id", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(120), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("stripe_event_id", name="uq_stripe_webhook_event_id"),
    )
    op.create_index(
        "ix_stripe_webhook_events_stripe_event_id",
        "stripe_webhook_events",
        ["stripe_event_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_stripe_webhook_events_stripe_event_id", table_name="stripe_webhook_events")
    op.drop_table("stripe_webhook_events")
