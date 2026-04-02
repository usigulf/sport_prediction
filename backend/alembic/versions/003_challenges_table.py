"""Challenges table

Revision ID: 003
Revises: 002
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "creator_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("game_ids", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), server_default="active", nullable=False),
        sa.Column("correct_count", sa.Integer(), server_default="0"),
        sa.Column("total_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("idx_challenges_creator_id", "challenges", ["creator_id"])
    op.create_index("idx_challenges_status", "challenges", ["status"])


def downgrade() -> None:
    op.drop_index("idx_challenges_status", table_name="challenges")
    op.drop_index("idx_challenges_creator_id", table_name="challenges")
    op.drop_table("challenges")
