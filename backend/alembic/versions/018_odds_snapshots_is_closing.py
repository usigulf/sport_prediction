"""018 — mark closing-line odds snapshots for market baseline / CLV ledger.

Revision ID: 018
Revises: 017
"""
from alembic import op
import sqlalchemy as sa

revision = "018"
down_revision = "017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "odds_snapshots",
        sa.Column("is_closing", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index(
        "ix_odds_snapshots_game_closing",
        "odds_snapshots",
        ["game_id", "is_closing"],
    )


def downgrade() -> None:
    op.drop_index("ix_odds_snapshots_game_closing", table_name="odds_snapshots")
    op.drop_column("odds_snapshots", "is_closing")
