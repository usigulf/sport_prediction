"""
Stats endpoints: model accuracy (prediction vs outcome), trust metadata, data coverage.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.trust_metrics_service import (
    aggregate_accuracy_from_finished,
    league_data_coverage,
    methodology_blurb,
)

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/accuracy")
async def get_accuracy(db: Session = Depends(get_db)):
    """
    Historical accuracy for finished games with a stored prediction.

    Public endpoint (no auth) for transparency. See `methodology` for scoring rules.
    Includes rolling 30-day window and confidence-bucket breakdown.
    """
    full = aggregate_accuracy_from_finished(db, since=None)
    now = datetime.now(timezone.utc)
    since_30d = now - timedelta(days=30)
    roll_30d = aggregate_accuracy_from_finished(db, since=since_30d)
    meta = methodology_blurb()

    return {
        **full,
        "rolling_30d": {
            "total_games": roll_30d["total_games"],
            "correct": roll_30d["correct"],
            "accuracy_pct": roll_30d["accuracy_pct"],
            "by_league": roll_30d["by_league"],
            "by_confidence": roll_30d["by_confidence"],
            "window_start_iso": since_30d.isoformat(),
        },
        "methodology": meta,
    }


@router.get("/coverage")
async def get_data_coverage(db: Session = Depends(get_db)):
    """
    Informational snapshot of which leagues have standings data in DB (partial coverage transparency).
    Expands as licensed feeds and sync jobs grow.
    """
    leagues = league_data_coverage(db)
    latest_sync_iso = None
    if leagues:
        latest_sync_iso = max(
            (row.get("standings_last_updated_iso") for row in leagues if row.get("standings_last_updated_iso")),
            default=None,
        )
    return {
        "leagues": leagues,
        "summary": {
            "leagues_with_standings": len(leagues),
            "latest_standings_sync_iso": latest_sync_iso,
        },
        "disclaimer": (
            "Coverage reflects data currently stored in our database and sync jobs — "
            "not every competition has injuries, odds, or lineups until fully licensed."
        ),
    }
