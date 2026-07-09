"""User privacy, Stripe customer, referral, trial-end fields.

Revision ID: 014
Revises: 013
"""
from alembic import op
import sqlalchemy as sa

revision = "014"
down_revision = "013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("stripe_customer_id", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("subscription_trial_end_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("ccpa_opt_out_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("referred_by_user_id", sa.UUID(), nullable=True))
    op.add_column(
        "users",
        sa.Column("trial_ending_push_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_stripe_customer_id", "users", ["stripe_customer_id"], unique=False)
    op.create_index("ix_users_referred_by_user_id", "users", ["referred_by_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_referred_by_user_id", table_name="users")
    op.drop_index("ix_users_stripe_customer_id", table_name="users")
    op.drop_column("users", "referred_by_user_id")
    op.drop_column("users", "trial_ending_push_sent_at")
    op.drop_column("users", "ccpa_opt_out_at")
    op.drop_column("users", "subscription_trial_end_at")
    op.drop_column("users", "stripe_customer_id")
