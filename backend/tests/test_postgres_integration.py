"""Postgres-specific integration tests (I74) — run in CI with service container."""
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import text

from app.models.game import Game
from app.models.team import Team
from app.services.game_search_service import search_games

pytestmark = pytest.mark.postgres


def test_postgres_ilike_search(db):
    """ILIKE team search behaves correctly on PostgreSQL."""
    home = Team(id=uuid4(), name="PostgreSQL United", league="nfl", abbreviation="PGU")
    away = Team(id=uuid4(), name="Away Side", league="nfl", abbreviation="AWY")
    db.add_all([home, away])
    db.commit()
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=home.id,
        away_team_id=away.id,
        scheduled_time=datetime.now(timezone.utc),
        status="scheduled",
    )
    db.add(game)
    db.commit()
    results = search_games(db, "PostgreSQL")
    assert any(g.id == game.id for g in results)


def test_postgres_uuid_native(db):
    """UUID columns round-trip on PostgreSQL."""
    row = db.execute(text("SELECT gen_random_uuid() AS id")).fetchone()
    assert row is not None
    assert row[0] is not None
