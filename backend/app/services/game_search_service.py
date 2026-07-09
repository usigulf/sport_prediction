"""PostgreSQL-backed game/team search (Weakness #37)."""
from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.models.team import Team


def search_games(db: Session, query: str, *, limit: int = 20) -> list[Game]:
    q = (query or "").strip()
    if len(q) < 2:
        return []
    pattern = f"%{q}%"
    team_ids = [
        row[0]
        for row in db.query(Team.id)
        .filter(or_(Team.name.ilike(pattern), Team.abbreviation.ilike(pattern)))
        .limit(100)
        .all()
    ]
    if not team_ids:
        return []
    cap = min(limit, 50)
    return (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(
            or_(Game.home_team_id.in_(team_ids), Game.away_team_id.in_(team_ids))
        )
        .order_by(Game.scheduled_time.desc())
        .limit(cap)
        .all()
    )
