"""Tests for league standings freshness helper."""
from datetime import datetime, timezone

from app.models.team_standing import TeamStanding
from app.services.data_quality_service import league_standings_last_updated_iso


def test_league_standings_last_updated_iso(db, test_teams):
    team = test_teams[0]
    ts = datetime(2026, 3, 1, 12, 0, tzinfo=timezone.utc)
    db.add(
        TeamStanding(
            league="nfl",
            team_id=team.id,
            league_rank=1,
            played=10,
            wins=7,
            draws=2,
            losses=1,
            updated_at=ts,
        )
    )
    db.commit()

    iso = league_standings_last_updated_iso(db, "nfl")
    assert iso is not None
    assert "2026-03-01" in iso


def test_league_standings_last_updated_iso_missing_league(db):
    assert league_standings_last_updated_iso(db, "nba") is None
    assert league_standings_last_updated_iso(db, "") is None
