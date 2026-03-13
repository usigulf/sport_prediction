"""Initial schema

Revision ID: 001
Revises: 
Create Date: 2026-02-09 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('subscription_tier', sa.String(20), server_default='free', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('idx_users_email', 'users', ['email'])

    # Teams table
    op.create_table(
        'teams',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('league', sa.String(50), nullable=False),
        sa.Column('abbreviation', sa.String(10)),
        sa.Column('logo_url', sa.String(500)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_teams_league', 'teams', ['league'])

    # Games table
    op.create_table(
        'games',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('league', sa.String(50), nullable=False),
        sa.Column('home_team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id'), nullable=False),
        sa.Column('away_team_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('teams.id'), nullable=False),
        sa.Column('scheduled_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('status', sa.String(20), server_default='scheduled', nullable=False),
        sa.Column('home_score', sa.Integer(), server_default='0'),
        sa.Column('away_score', sa.Integer(), server_default='0'),
        sa.Column('venue', sa.String(255)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_games_league_scheduled', 'games', ['league', 'scheduled_time'])
    op.create_index('idx_games_status', 'games', ['status'])

    # Predictions table
    op.create_table(
        'predictions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('game_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('games.id'), nullable=False),
        sa.Column('model_version', sa.String(50), nullable=False),
        sa.Column('home_win_probability', sa.Numeric(5, 4), nullable=False),
        sa.Column('away_win_probability', sa.Numeric(5, 4), nullable=False),
        sa.Column('expected_home_score', sa.Numeric(5, 2)),
        sa.Column('expected_away_score', sa.Numeric(5, 2)),
        sa.Column('confidence_level', sa.String(20)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('idx_predictions_game', 'predictions', ['game_id', 'created_at'])
    op.create_unique_constraint('uq_prediction_game_model_time', 'predictions', ['game_id', 'model_version', 'created_at'])


def downgrade() -> None:
    op.drop_table('predictions')
    op.drop_table('games')
    op.drop_table('teams')
    op.drop_table('users')
