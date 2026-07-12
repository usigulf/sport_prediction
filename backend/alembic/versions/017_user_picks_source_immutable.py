"""User picks: source column + mark legacy rows unverified.

Revision ID: 017
Revises: 016
"""
from alembic import op
import sqlalchemy as sa

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "user_picks",
        sa.Column(
            "source",
            sa.String(32),
            nullable=False,
            server_default="legacy_unverified",
        ),
    )
    # Existing rows were often auto-written from the model; quarantine for trust.
    op.execute(
        "UPDATE user_picks SET source = 'legacy_unverified' WHERE source IS NULL OR source = ''"
    )
    op.alter_column("user_picks", "source", server_default="user")


def downgrade() -> None:
    op.drop_column("user_picks", "source")
