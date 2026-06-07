"""Stale scheduled games are marked finished after kickoff."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.team import Team
from app.services.game_status_reconcile import reconcile_past_scheduled_games


def test_reconcile_past_scheduled_marks_finished(db):
    h = Team(id=uuid4(), name="Home", league="champions_league", abbreviation="HOM")
    a = Team(id=uuid4(), name="Away", league="champions_league", abbreviation="AWY")
    db.add_all([h, a])
    db.flush()
    kickoff = datetime.now(timezone.utc) - timedelta(hours=5)
    g = Game(
        id=uuid4(),
        league="champions_league",
        home_team_id=h.id,
        away_team_id=a.id,
        scheduled_time=kickoff,
        status="scheduled",
    )
    db.add(g)
    db.commit()

    n = reconcile_past_scheduled_games(db, grace_hours=2.5)
    assert n == 1
    db.refresh(g)
    assert g.status == "finished"
