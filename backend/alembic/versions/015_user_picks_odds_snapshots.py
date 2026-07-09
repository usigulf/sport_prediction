"""User picks and odds snapshots for Brier / line movement / CLV.

Revision ID: 015
Revises: 014
"""
from alembic import op
import sqlalchemy as sa

revision = "015"
down_revision = "014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_picks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("game_id", sa.UUID(), nullable=False),
        sa.Column("outcome", sa.String(10), nullable=False),
        sa.Column("probability", sa.Numeric(5, 4), nullable=False),
        sa.Column("market_home_implied_prob", sa.Numeric(5, 4), nullable=True),
        sa.Column("market_away_implied_prob", sa.Numeric(5, 4), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "game_id", name="uq_user_pick_user_game"),
    )
    op.create_index("ix_user_picks_user_id", "user_picks", ["user_id"])
    op.create_index("ix_user_picks_game_id", "user_picks", ["game_id"])

    op.create_table(
        "odds_snapshots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("game_id", sa.UUID(), nullable=False),
        sa.Column("captured_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("provider", sa.String(50), nullable=True),
        sa.Column("home_moneyline", sa.Integer(), nullable=True),
        sa.Column("away_moneyline", sa.Integer(), nullable=True),
        sa.Column("home_implied_prob", sa.Numeric(5, 4), nullable=True),
        sa.Column("away_implied_prob", sa.Numeric(5, 4), nullable=True),
        sa.Column("spread_home", sa.Numeric(5, 2), nullable=True),
        sa.Column("total_points", sa.Numeric(5, 2), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_odds_snapshots_game_id", "odds_snapshots", ["game_id"])
    op.create_index("ix_odds_snapshots_captured_at", "odds_snapshots", ["captured_at"])
    op.create_index("idx_odds_snapshots_game_captured", "odds_snapshots", ["game_id", "captured_at"])


def downgrade() -> None:
    op.drop_index("idx_odds_snapshots_game_captured", table_name="odds_snapshots")
    op.drop_index("ix_odds_snapshots_captured_at", table_name="odds_snapshots")
    op.drop_index("ix_odds_snapshots_game_id", table_name="odds_snapshots")
    op.drop_table("odds_snapshots")
    op.drop_index("ix_user_picks_game_id", table_name="user_picks")
    op.drop_index("ix_user_picks_user_id", table_name="user_picks")
    op.drop_table("user_picks")
