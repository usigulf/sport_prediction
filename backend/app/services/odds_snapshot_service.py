"""Odds snapshot persistence and line movement / CLV helpers (I62, I63)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.odds_snapshot import OddsSnapshot

MIN_SNAPSHOT_INTERVAL = timedelta(minutes=5)


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def maybe_record_odds_snapshot(
    db: Session,
    game: Game,
    odds_payload: dict[str, Any],
) -> OddsSnapshot | None:
    """Persist consensus odds when available; dedupe rapid repeated fetches."""
    if not odds_payload.get("available"):
        return None
    consensus = odds_payload.get("consensus") or {}
    if consensus.get("home_implied_prob") is None and consensus.get("spread_home") is None:
        return None

    latest = (
        db.query(OddsSnapshot)
        .filter(OddsSnapshot.game_id == game.id)
        .order_by(desc(OddsSnapshot.captured_at))
        .first()
    )
    now = datetime.now(timezone.utc)
    if latest and latest.captured_at:
        captured = _as_utc(latest.captured_at)
        if captured and now - captured < MIN_SNAPSHOT_INTERVAL:
            return None

    snap = OddsSnapshot(
        game_id=game.id,
        captured_at=now,
        provider=odds_payload.get("provider"),
        home_moneyline=consensus.get("home_moneyline"),
        away_moneyline=consensus.get("away_moneyline"),
        home_implied_prob=consensus.get("home_implied_prob"),
        away_implied_prob=consensus.get("away_implied_prob"),
        spread_home=consensus.get("spread_home"),
        total_points=consensus.get("total_points"),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


def build_line_movement_series(db: Session, game: Game, *, limit: int = 120) -> dict[str, Any]:
    rows = (
        db.query(OddsSnapshot)
        .filter(OddsSnapshot.game_id == game.id)
        .order_by(OddsSnapshot.captured_at.asc())
        .limit(limit)
        .all()
    )
    points = []
    for row in rows:
        captured = _as_utc(row.captured_at)
        points.append(
            {
                "captured_at_iso": captured.isoformat() if captured else None,
                "home_implied_prob": float(row.home_implied_prob) if row.home_implied_prob is not None else None,
                "away_implied_prob": float(row.away_implied_prob) if row.away_implied_prob is not None else None,
                "spread_home": float(row.spread_home) if row.spread_home is not None else None,
                "total_points": float(row.total_points) if row.total_points is not None else None,
                "home_moneyline": row.home_moneyline,
                "away_moneyline": row.away_moneyline,
            }
        )
    return {
        "game_id": str(game.id),
        "point_count": len(points),
        "points": points,
        "disclaimer": (
            "Historical consensus snapshots from market-odds fetches — informational only, "
            "not a complete tick-by-tick feed."
        ),
    }


def closing_snapshot_before_kickoff(db: Session, game: Game) -> OddsSnapshot | None:
    marked = (
        db.query(OddsSnapshot)
        .filter(OddsSnapshot.game_id == game.id, OddsSnapshot.is_closing.is_(True))
        .order_by(desc(OddsSnapshot.captured_at))
        .first()
    )
    if marked is not None:
        return marked
    kickoff = _as_utc(game.scheduled_time)
    q = db.query(OddsSnapshot).filter(OddsSnapshot.game_id == game.id)
    if kickoff is not None:
        q = q.filter(OddsSnapshot.captured_at <= kickoff)
    return q.order_by(desc(OddsSnapshot.captured_at)).first()


def implied_prob_for_outcome(
    outcome: str,
    *,
    home_implied: float | None,
    away_implied: float | None,
) -> float | None:
    o = outcome.lower()
    if o == "home":
        return home_implied
    if o == "away":
        return away_implied
    if o == "draw" and home_implied is not None and away_implied is not None:
        return max(0.0, 1.0 - home_implied - away_implied)
    return None


def compute_clv_for_pick(
    db: Session,
    *,
    game: Game,
    outcome: str,
    pick_home_implied: float | None,
    pick_away_implied: float | None,
) -> dict[str, Any] | None:
    """
    CLV = closing implied prob minus pick-time implied prob on the chosen side.
    Positive means the line moved in the user's favor after the pick.
    """
    closing = closing_snapshot_before_kickoff(db, game)
    if closing is None:
        return None
    pick_implied = implied_prob_for_outcome(
        outcome,
        home_implied=pick_home_implied,
        away_implied=pick_away_implied,
    )
    close_home = float(closing.home_implied_prob) if closing.home_implied_prob is not None else None
    close_away = float(closing.away_implied_prob) if closing.away_implied_prob is not None else None
    close_implied = implied_prob_for_outcome(outcome, home_implied=close_home, away_implied=close_away)
    if pick_implied is None or close_implied is None:
        return None
    clv = round(close_implied - pick_implied, 4)
    return {
        "outcome": outcome,
        "pick_implied_prob": round(pick_implied, 4),
        "closing_implied_prob": round(close_implied, 4),
        "clv": clv,
        "closing_captured_at_iso": _as_utc(closing.captured_at).isoformat() if closing.captured_at else None,
    }
