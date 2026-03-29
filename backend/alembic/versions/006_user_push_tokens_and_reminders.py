"""User push tokens and push reminder tracking

Revision ID: 006
Revises: 005
Create Date: 2026-03-28

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_push_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("token", sa.String(256), nullable=False),
        sa.Column("platform", sa.String(20), server_default="expo", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_user_push_tokens_user_id", "user_push_tokens", ["user_id"])
    op.create_index("ix_user_push_tokens_token", "user_push_tokens", ["token"])
    op.create_unique_constraint("uq_user_push_token", "user_push_tokens", ["user_id", "token"])

    op.create_table(
        "push_reminder_sent",
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
        sa.Column("reminder_type", sa.String(50), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_push_reminder_sent_user_id", "push_reminder_sent", ["user_id"])
    op.create_index("ix_push_reminder_sent_game_id", "push_reminder_sent", ["game_id"])
    op.create_unique_constraint(
        "uq_push_reminder_user_game_type",
        "push_reminder_sent",
        ["user_id", "game_id", "reminder_type"],
    )


def downgrade() -> None:
    op.drop_table("push_reminder_sent")
    op.drop_table("user_push_tokens")
