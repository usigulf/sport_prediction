"""User picks: source column + mark legacy rows unverified.

Revision ID: 017
Revises: 016

SQLite does not support ALTER COLUMN … SET DEFAULT; add the column with the
final server_default and backfill existing rows instead.
"""
from alembic import op
import sqlalchemy as sa

revision = "017"
down_revision = "016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    cols = {c["name"] for c in sa.inspect(bind).get_columns("user_picks")}

    if "source" not in cols:
        # Final default is "user" for new explicit picks. Existing rows are
        # filled with that default at ADD time, then quarantined below.
        op.add_column(
            "user_picks",
            sa.Column(
                "source",
                sa.String(32),
                nullable=False,
                server_default="user",
            ),
        )
        op.execute(sa.text("UPDATE user_picks SET source = 'legacy_unverified'"))
        return

    # Recover a partial prior run (column present, default may still be legacy).
    op.execute(
        sa.text(
            "UPDATE user_picks SET source = 'legacy_unverified' "
            "WHERE source IS NULL OR source = ''"
        )
    )
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("user_picks") as batch_op:
            batch_op.alter_column(
                "source",
                existing_type=sa.String(32),
                existing_nullable=False,
                server_default="user",
            )
    else:
        op.alter_column("user_picks", "source", server_default="user")


def downgrade() -> None:
    op.drop_column("user_picks", "source")
