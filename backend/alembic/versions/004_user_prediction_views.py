"""User prediction views table

Revision ID: 004
Revises: 003
Create Date: 2026-03-23
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_prediction_views",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "game_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("games.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "prediction_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("predictions.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("viewed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("idx_user_prediction_views_user_id", "user_prediction_views", ["user_id"])
    op.create_index("idx_user_prediction_views_game_id", "user_prediction_views", ["game_id"])
    op.create_index("idx_user_prediction_views_prediction_id", "user_prediction_views", ["prediction_id"])


def downgrade() -> None:
    op.drop_index("idx_user_prediction_views_prediction_id", table_name="user_prediction_views")
    op.drop_index("idx_user_prediction_views_game_id", table_name="user_prediction_views")
    op.drop_index("idx_user_prediction_views_user_id", table_name="user_prediction_views")
    op.drop_table("user_prediction_views")
