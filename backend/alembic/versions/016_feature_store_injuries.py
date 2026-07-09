"""Feature store + injury tables.

Revision ID: 016
Revises: 015
"""
from alembic import op
import sqlalchemy as sa

revision = "016"
down_revision = "015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "game_feature_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("game_id", sa.UUID(), nullable=False),
        sa.Column("prediction_id", sa.UUID(), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("feature_source", sa.String(40), nullable=False),
        sa.Column("model_version", sa.String(50), nullable=True),
        sa.Column("features_json", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["prediction_id"], ["predictions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_game_feature_snapshots_game_id", "game_feature_snapshots", ["game_id"])
    op.create_index("ix_game_feature_snapshots_captured_at", "game_feature_snapshots", ["captured_at"])

    op.create_table(
        "game_injury_reports",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("game_id", sa.UUID(), nullable=False),
        sa.Column("player_name", sa.String(255), nullable=False),
        sa.Column("team_name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(40), nullable=False),
        sa.Column("detail", sa.Text(), nullable=True),
        sa.Column("source", sa.String(80), nullable=True),
        sa.Column("reported_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_game_injury_reports_game_id", "game_injury_reports", ["game_id"])


def downgrade() -> None:
    op.drop_index("ix_game_injury_reports_game_id", table_name="game_injury_reports")
    op.drop_table("game_injury_reports")
    op.drop_index("ix_game_feature_snapshots_captured_at", table_name="game_feature_snapshots")
    op.drop_index("ix_game_feature_snapshots_game_id", table_name="game_feature_snapshots")
    op.drop_table("game_feature_snapshots")
