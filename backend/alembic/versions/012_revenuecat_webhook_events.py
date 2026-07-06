"""revenuecat_webhook_events dedup table for RevenueCat webhook idempotency (P0-009)."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "012"
down_revision = "011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "revenuecat_webhook_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("revenuecat_event_id", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(120), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("revenuecat_event_id", name="uq_revenuecat_webhook_event_id"),
    )
    op.create_index(
        "ix_revenuecat_webhook_events_revenuecat_event_id",
        "revenuecat_webhook_events",
        ["revenuecat_event_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_revenuecat_webhook_events_revenuecat_event_id",
        table_name="revenuecat_webhook_events",
    )
    op.drop_table("revenuecat_webhook_events")
