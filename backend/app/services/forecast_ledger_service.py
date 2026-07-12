"""Append-only forecast ledger — verifiable issued picks (external audit days 31–60).

Every prediction job write appends a ledger row with a content hash chained to the
previous entry. Application code never updates or deletes ledger rows; Postgres
also enforces that with a trigger (migration 019).
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.forecast_ledger_entry import ForecastLedgerEntry
from app.models.game import Game
from app.models.prediction import Prediction
from app.utils.prediction_source import classify_prediction_source


def _as_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _iso_utc(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    aware = _as_utc(dt)
    assert aware is not None
    # Normalize so hash verify matches across SQLite/Postgres round-trips.
    return aware.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _round4(value: Any) -> float:
    return round(float(value), 4)


def _canonical_payload(fields: dict[str, Any]) -> str:
    return json.dumps(fields, sort_keys=True, separators=(",", ":"), default=str)


def compute_content_hash(fields: dict[str, Any], *, prev_content_hash: str | None) -> str:
    body = _canonical_payload({**fields, "prev_content_hash": prev_content_hash})
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def _latest_entry(db: Session) -> ForecastLedgerEntry | None:
    return db.query(ForecastLedgerEntry).order_by(desc(ForecastLedgerEntry.sequence)).first()


def append_forecast_ledger_entry(
    db: Session,
    *,
    game: Game,
    prediction: Prediction,
    feature_source: str | None = None,
    commit: bool = True,
) -> ForecastLedgerEntry:
    """Append one immutable ledger row for an issued prediction."""
    settings = get_settings()
    source = classify_prediction_source(
        prediction.model_version,
        default_version=settings.ml_model_version,
    )
    wall = datetime.now(timezone.utc)
    issued = _as_utc(prediction.created_at) or wall
    kickoff = _as_utc(game.scheduled_time)

    prev = _latest_entry(db)
    sequence = int(prev.sequence) + 1 if prev is not None else 1
    prev_hash = prev.content_hash if prev is not None else None

    fields = {
        "game_id": str(game.id),
        "prediction_id": str(prediction.id),
        "sequence": sequence,
        "issued_at": _iso_utc(issued),
        "kickoff_at": _iso_utc(kickoff),
        "league": (game.league or "").lower(),
        "model_version": prediction.model_version,
        "prediction_source": source,
        "prediction_type": prediction.prediction_type,
        "home_win_probability": _round4(prediction.home_win_probability),
        "away_win_probability": _round4(prediction.away_win_probability),
        "expected_home_score": (
            _round4(prediction.expected_home_score)
            if prediction.expected_home_score is not None
            else None
        ),
        "expected_away_score": (
            _round4(prediction.expected_away_score)
            if prediction.expected_away_score is not None
            else None
        ),
        "confidence_level": prediction.confidence_level,
        "feature_source": feature_source,
    }
    content_hash = compute_content_hash(fields, prev_content_hash=prev_hash)

    entry = ForecastLedgerEntry(
        id=uuid4(),
        game_id=game.id,
        prediction_id=prediction.id,
        sequence=sequence,
        issued_at=issued,
        wall_clock_at=wall,
        kickoff_at=kickoff,
        league=fields["league"],
        model_version=prediction.model_version,
        prediction_source=source,
        prediction_type=prediction.prediction_type,
        home_win_probability=fields["home_win_probability"],
        away_win_probability=fields["away_win_probability"],
        expected_home_score=fields["expected_home_score"],
        expected_away_score=fields["expected_away_score"],
        confidence_level=prediction.confidence_level,
        feature_source=feature_source,
        content_hash=content_hash,
        prev_content_hash=prev_hash,
    )
    db.add(entry)
    if commit:
        db.commit()
        db.refresh(entry)
    return entry


def verify_forecast_ledger_chain(
    db: Session,
    *,
    limit: int | None = None,
) -> dict[str, Any]:
    """Recompute hashes in sequence order; report first break if any."""
    q = db.query(ForecastLedgerEntry).order_by(ForecastLedgerEntry.sequence.asc())
    if limit is not None:
        q = q.limit(limit)
    rows = q.all()
    prev_hash: str | None = None
    checked = 0
    for row in rows:
        fields = {
            "game_id": str(row.game_id),
            "prediction_id": str(row.prediction_id) if row.prediction_id else None,
            "sequence": int(row.sequence),
            "issued_at": _iso_utc(row.issued_at),
            "kickoff_at": _iso_utc(row.kickoff_at),
            "league": row.league,
            "model_version": row.model_version,
            "prediction_source": row.prediction_source,
            "prediction_type": row.prediction_type,
            "home_win_probability": _round4(row.home_win_probability),
            "away_win_probability": _round4(row.away_win_probability),
            "expected_home_score": (
                _round4(row.expected_home_score) if row.expected_home_score is not None else None
            ),
            "expected_away_score": (
                _round4(row.expected_away_score) if row.expected_away_score is not None else None
            ),
            "confidence_level": row.confidence_level,
            "feature_source": row.feature_source,
        }
        expected = compute_content_hash(fields, prev_content_hash=prev_hash)
        checked += 1
        if row.prev_content_hash != prev_hash or row.content_hash != expected:
            return {
                "ok": False,
                "checked": checked,
                "broken_at_sequence": int(row.sequence),
                "detail": "hash chain mismatch",
            }
        prev_hash = row.content_hash
    return {"ok": True, "checked": checked, "broken_at_sequence": None, "detail": "chain intact"}


def forecast_ledger_for_game(db: Session, game_id: UUID, *, limit: int = 50) -> dict[str, Any]:
    rows = (
        db.query(ForecastLedgerEntry)
        .filter(ForecastLedgerEntry.game_id == game_id)
        .order_by(desc(ForecastLedgerEntry.sequence))
        .limit(limit)
        .all()
    )
    entries = []
    for row in rows:
        issued = _as_utc(row.issued_at)
        wall = _as_utc(row.wall_clock_at)
        kickoff = _as_utc(row.kickoff_at)
        entries.append(
            {
                "sequence": int(row.sequence),
                "prediction_id": str(row.prediction_id) if row.prediction_id else None,
                "issued_at_iso": issued.isoformat() if issued else None,
                "wall_clock_at_iso": wall.isoformat() if wall else None,
                "kickoff_at_iso": kickoff.isoformat() if kickoff else None,
                "league": row.league,
                "model_version": row.model_version,
                "prediction_source": row.prediction_source,
                "prediction_type": row.prediction_type,
                "home_win_probability": float(row.home_win_probability),
                "away_win_probability": float(row.away_win_probability),
                "confidence_level": row.confidence_level,
                "feature_source": row.feature_source,
                "content_hash": row.content_hash,
                "prev_content_hash": row.prev_content_hash,
            }
        )
    return {
        "game_id": str(game_id),
        "entry_count": len(entries),
        "entries": entries,
        "disclaimer": (
            "Append-only forecast ledger — informational issued picks with content hashes. "
            "Not betting advice."
        ),
    }


def forecast_ledger_summary(db: Session) -> dict[str, Any]:
    total = db.query(func.count(ForecastLedgerEntry.id)).scalar() or 0
    latest = db.query(func.max(ForecastLedgerEntry.issued_at)).scalar()
    by_source = (
        db.query(ForecastLedgerEntry.prediction_source, func.count(ForecastLedgerEntry.id))
        .group_by(ForecastLedgerEntry.prediction_source)
        .all()
    )
    chain = verify_forecast_ledger_chain(db, limit=5000)
    latest_iso = None
    if latest is not None:
        latest_utc = _as_utc(latest) if isinstance(latest, datetime) else None
        latest_iso = latest_utc.isoformat() if latest_utc else str(latest)
    return {
        "total_entries": int(total),
        "latest_issued_at_iso": latest_iso,
        "by_prediction_source": {str(src): int(n) for src, n in by_source},
        "chain_ok": bool(chain.get("ok")),
        "chain_checked": chain.get("checked"),
        "protocol": "docs/FORECAST_LEDGER.md",
    }
