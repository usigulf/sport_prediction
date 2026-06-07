"""Mark stale scheduled games finished after kickoff (schedule feeds sometimes lag)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.models.game import Game


def reconcile_past_scheduled_games(
    db: Session,
    *,
    grace_hours: float = 2.5,
    leagues: list[str] | None = None,
) -> int:
    """
    Games still `scheduled` long after kickoff are marked `finished`.
    Scores are left as-is (often 0-0 until the next provider sync fills them in).
    """
    cutoff = datetime.now(timezone.utc) - timedelta(hours=grace_hours)
    q = db.query(Game).filter(
        Game.status == "scheduled",
        Game.scheduled_time.isnot(None),
        Game.scheduled_time < cutoff,
    )
    if leagues:
        q = q.filter(Game.league.in_(leagues))
    rows = q.all()
    for g in rows:
        g.status = "finished"
    if rows:
        db.commit()
    return len(rows)
