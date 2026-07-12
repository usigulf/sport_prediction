"""019 — append-only forecast ledger for auditable issued picks.

Revision ID: 019
Revises: 018
"""
from alembic import op
import sqlalchemy as sa

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "forecast_ledger_entries",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("game_id", sa.UUID(), nullable=False),
        sa.Column("prediction_id", sa.UUID(), nullable=True),
        sa.Column("sequence", sa.BigInteger(), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("wall_clock_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("kickoff_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("league", sa.String(64), nullable=False),
        sa.Column("model_version", sa.String(50), nullable=False),
        sa.Column("prediction_source", sa.String(32), nullable=False),
        sa.Column("prediction_type", sa.String(20), nullable=True),
        sa.Column("home_win_probability", sa.Numeric(5, 4), nullable=False),
        sa.Column("away_win_probability", sa.Numeric(5, 4), nullable=False),
        sa.Column("expected_home_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("expected_away_score", sa.Numeric(5, 2), nullable=True),
        sa.Column("confidence_level", sa.String(20), nullable=True),
        sa.Column("feature_source", sa.String(40), nullable=True),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("prev_content_hash", sa.String(64), nullable=True),
        sa.ForeignKeyConstraint(["game_id"], ["games.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["prediction_id"], ["predictions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("sequence", name="uq_forecast_ledger_sequence"),
        sa.UniqueConstraint("content_hash", name="uq_forecast_ledger_content_hash"),
    )
    op.create_index("ix_forecast_ledger_game_id", "forecast_ledger_entries", ["game_id"])
    op.create_index("ix_forecast_ledger_issued_at", "forecast_ledger_entries", ["issued_at"])
    op.create_index("ix_forecast_ledger_league", "forecast_ledger_entries", ["league"])
    op.create_index("ix_forecast_ledger_prediction_id", "forecast_ledger_entries", ["prediction_id"])

    # Postgres: refuse UPDATE/DELETE (append-only). SQLite tests skip triggers.
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(
            """
            CREATE OR REPLACE FUNCTION forecast_ledger_refuse_mutation()
            RETURNS trigger AS $$
            BEGIN
              RAISE EXCEPTION 'forecast_ledger_entries is append-only';
            END;
            $$ LANGUAGE plpgsql;
            """
        )
        op.execute(
            """
            CREATE TRIGGER trg_forecast_ledger_no_update
            BEFORE UPDATE OR DELETE ON forecast_ledger_entries
            FOR EACH ROW EXECUTE PROCEDURE forecast_ledger_refuse_mutation();
            """
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("DROP TRIGGER IF EXISTS trg_forecast_ledger_no_update ON forecast_ledger_entries")
        op.execute("DROP FUNCTION IF EXISTS forecast_ledger_refuse_mutation()")
    op.drop_index("ix_forecast_ledger_prediction_id", table_name="forecast_ledger_entries")
    op.drop_index("ix_forecast_ledger_league", table_name="forecast_ledger_entries")
    op.drop_index("ix_forecast_ledger_issued_at", table_name="forecast_ledger_entries")
    op.drop_index("ix_forecast_ledger_game_id", table_name="forecast_ledger_entries")
    op.drop_table("forecast_ledger_entries")
