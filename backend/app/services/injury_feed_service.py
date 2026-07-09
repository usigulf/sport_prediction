"""Injury reports for games (I97) — DB + spotlight sync."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.game_injury_report import GameInjuryReport
from app.models.game_player_spotlight import GamePlayerSpotlight

_INJURY_KEYWORDS = re.compile(
    r"\b(out|injur|doubtful|questionable|sidelined|inactive|ruled out|did not practice|dnp)\b",
    re.I,
)


def _status_from_text(text: str) -> str:
    t = text.lower()
    if "questionable" in t:
        return "questionable"
    if "doubtful" in t:
        return "doubtful"
    return "out"


def sync_injuries_from_spotlights(db: Session, game: Game) -> int:
    """Promote spotlight rows that mention injuries into structured reports."""
    spotlights = (
        db.query(GamePlayerSpotlight)
        .filter(GamePlayerSpotlight.game_id == game.id)
        .order_by(GamePlayerSpotlight.sort_order.asc())
        .all()
    )
    created = 0
    for sp in spotlights:
        blob = f"{sp.role or ''} {sp.summary or ''}"
        if not _INJURY_KEYWORDS.search(blob):
            continue
        exists = (
            db.query(GameInjuryReport)
            .filter(
                GameInjuryReport.game_id == game.id,
                GameInjuryReport.player_name == sp.player_name,
            )
            .first()
        )
        if exists:
            continue
        db.add(
            GameInjuryReport(
                game_id=game.id,
                player_name=sp.player_name,
                team_name=sp.team_name,
                status=_status_from_text(blob),
                detail=sp.summary,
                source="spotlight_sync",
            )
        )
        created += 1
    if created:
        db.commit()
    return created


def list_injuries_for_game(db: Session, game: Game) -> dict[str, Any]:
    sync_injuries_from_spotlights(db, game)
    rows = (
        db.query(GameInjuryReport)
        .filter(GameInjuryReport.game_id == game.id)
        .order_by(GameInjuryReport.reported_at.desc())
        .all()
    )
    injuries = []
    for row in rows:
        reported = row.reported_at
        if reported and reported.tzinfo is None:
            reported = reported.replace(tzinfo=timezone.utc)
        injuries.append(
            {
                "player_name": row.player_name,
                "team_name": row.team_name,
                "status": row.status,
                "detail": row.detail,
                "source": row.source,
                "reported_at_iso": reported.isoformat() if reported else None,
            }
        )
    return {
        "game_id": str(game.id),
        "count": len(injuries),
        "injuries": injuries,
        "disclaimer": "Injury information is informational and may be delayed or incomplete.",
    }
