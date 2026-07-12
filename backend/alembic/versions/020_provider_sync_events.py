"""020 — provider sync event log for data lineage / freshness telemetry.

Revision ID: 020
Revises: 019
"""
from alembic import op
import sqlalchemy as sa

revision = "020"
down_revision = "019"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "provider_sync_events",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("provider", sa.String(40), nullable=False),
        sa.Column("job", sa.String(64), nullable=False),
        sa.Column("league", sa.String(64), nullable=True),
        sa.Column("ok", sa.Boolean(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("rows_touched", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(64), nullable=True),
        sa.Column("error_detail", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_provider_sync_events_started_at", "provider_sync_events", ["started_at"])
    op.create_index("ix_provider_sync_events_provider", "provider_sync_events", ["provider"])
    op.create_index("ix_provider_sync_events_job", "provider_sync_events", ["job"])
    op.create_index("ix_provider_sync_events_league", "provider_sync_events", ["league"])
    op.create_index("ix_provider_sync_events_ok", "provider_sync_events", ["ok"])


def downgrade() -> None:
    op.drop_index("ix_provider_sync_events_ok", table_name="provider_sync_events")
    op.drop_index("ix_provider_sync_events_league", table_name="provider_sync_events")
    op.drop_index("ix_provider_sync_events_job", table_name="provider_sync_events")
    op.drop_index("ix_provider_sync_events_provider", table_name="provider_sync_events")
    op.drop_index("ix_provider_sync_events_started_at", table_name="provider_sync_events")
    op.drop_table("provider_sync_events")
