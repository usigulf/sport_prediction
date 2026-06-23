"""Add prediction_type for pre-kickoff accuracy lock (C-06)

Revision ID: 010
Revises: 009
Create Date: 2026-05-30
"""
from alembic import op
import sqlalchemy as sa

revision = "010"
down_revision = "009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "predictions",
        sa.Column("prediction_type", sa.String(length=20), nullable=True),
    )
    op.create_index("ix_predictions_prediction_type", "predictions", ["prediction_type"])

    conn = op.get_bind()
    conn.execute(
        sa.text(
            """
            UPDATE predictions
            SET prediction_type = 'inplay_v0'
            WHERE id IN (
                SELECT p.id
                FROM predictions AS p
                INNER JOIN games AS g ON p.game_id = g.id
                WHERE LOWER(p.model_version) LIKE '%inplay_v0%'
                   OR (
                        p.created_at IS NOT NULL
                        AND g.scheduled_time IS NOT NULL
                        AND p.created_at >= g.scheduled_time
                   )
            )
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE predictions
            SET prediction_type = 'pre_game'
            WHERE prediction_type IS NULL
            """
        )
    )


def downgrade() -> None:
    op.drop_index("ix_predictions_prediction_type", table_name="predictions")
    op.drop_column("predictions", "prediction_type")
