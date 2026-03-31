"""Add team_standings for league table snapshots

Revision ID: 006
Revises: 005
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "team_standings",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("league", sa.String(length=50), nullable=False),
        sa.Column("team_id", sa.String(length=36), nullable=False),
        sa.Column("league_rank", sa.Integer(), nullable=False),
        sa.Column("played", sa.Integer(), nullable=False),
        sa.Column("wins", sa.Integer(), nullable=False),
        sa.Column("draws", sa.Integer(), nullable=False),
        sa.Column("losses", sa.Integer(), nullable=False),
        sa.Column("points", sa.Integer(), nullable=True),
        sa.Column("goals_for", sa.Integer(), nullable=True),
        sa.Column("goals_against", sa.Integer(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("league", "team_id", name="uq_standing_league_team"),
    )
    op.create_index("ix_team_standings_league", "team_standings", ["league"])
    op.create_index("ix_team_standings_team_id", "team_standings", ["team_id"])


def downgrade() -> None:
    op.drop_index("ix_team_standings_team_id", table_name="team_standings")
    op.drop_index("ix_team_standings_league", table_name="team_standings")
    op.drop_table("team_standings")
