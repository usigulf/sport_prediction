"""
Stats endpoints: model accuracy (prediction vs outcome), trust metadata, data coverage.
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.trust_metrics_service import (
    aggregate_accuracy_from_finished,
    aggregate_calibration_from_finished,
    league_data_coverage,
    methodology_blurb,
)
from app.services.model_training import load_metrics_json
from app.services.model_vs_market_service import build_model_vs_market_summary
from app.config import get_settings

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/accuracy")
async def get_accuracy(db: Session = Depends(get_db)):
    """
    Historical accuracy for finished games with a stored pre_game prediction.

    Public endpoint (no auth) for transparency. Live in-play refreshes (inplay_v0) are
    excluded; each game uses the first pre-kickoff row. See `methodology` for scoring rules.
    Includes rolling 30-day window and confidence-bucket breakdown.
    """
    full = aggregate_accuracy_from_finished(db, since=None)
    now = datetime.now(timezone.utc)
    since_30d = now - timedelta(days=30)
    roll_30d = aggregate_accuracy_from_finished(db, since=since_30d)
    meta = methodology_blurb()

    return {
        **full,
        "total": full["total_games"],
        "computed_at_iso": now.isoformat(),
        "rolling_30d": {
            "total_games": roll_30d["total_games"],
            "total": roll_30d["total_games"],
            "correct": roll_30d["correct"],
            "accuracy_pct": roll_30d["accuracy_pct"],
            "by_league": roll_30d["by_league"],
            "by_confidence": roll_30d["by_confidence"],
            "window_start_iso": since_30d.isoformat(),
        },
        "methodology": meta,
    }


@router.get("/calibration")
async def get_calibration(db: Session = Depends(get_db)):
    """
    Reliability diagram: predicted outcome probability vs actual hit rate in decile buckets.
    Chart is shown in-app when total_scored >= min_sample (100).
    """
    now = datetime.now(timezone.utc)
    payload = aggregate_calibration_from_finished(db, since=None)
    return {
        **payload,
        "computed_at_iso": now.isoformat(),
        "methodology": (
            "Each finished game uses the first pre-kickoff prediction. We bucket by the model's "
            "probability on its predicted outcome (home, away, or draw for soccer), then plot "
            "how often that pick was right. Points on the diagonal mean well-calibrated probabilities."
        ),
    }


@router.get("/model")
async def get_model_status():
    """
    Public model readiness snapshot from metrics.json (warming vs ready to publish).
    When artifacts are missing or publish_ready is false, inference uses heuristic fallback.
    """
    settings = get_settings()
    model_dir = (settings.model_artifact_dir or settings.explanation_model_dir or "").strip()
    if not model_dir:
        return {
            "status": "warming",
            "publish_ready": False,
            "artifacts_written": False,
            "detail": "Model artifact directory is not configured on this API instance.",
        }
    metrics = load_metrics_json(model_dir)
    if not metrics:
        return {
            "status": "warming",
            "publish_ready": False,
            "artifacts_written": False,
            "detail": "No metrics.json found — model has not been trained on this host yet.",
        }
    status = metrics.get("status") or ("ready" if metrics.get("publish_ready") else "warming")
    return {
        "status": status,
        "publish_ready": bool(metrics.get("publish_ready")),
        "artifacts_written": bool(metrics.get("artifacts_written")),
        "games": metrics.get("games"),
        "trained_at": metrics.get("trained_at"),
        "league_counts": metrics.get("league_counts"),
        "league_group_corpus_counts": metrics.get("league_group_corpus_counts"),
        "league_group_holdout_counts": metrics.get("league_group_holdout_counts"),
        "publish_block_reasons": metrics.get("publish_block_reasons") or [],
        "min_publish_holdout_per_league_group": metrics.get("min_publish_holdout_per_league_group"),
        "detail": metrics.get("note"),
    }


@router.get("/public-audit")
async def get_public_audit_bundle(db: Session = Depends(get_db)):
    """
    Third-party accuracy audit bundle (Imp #94): accuracy, calibration, model readiness.
    Stable JSON for external reviewers — no auth required.
    """
    now = datetime.now(timezone.utc)
    since_30d = now - timedelta(days=30)
    accuracy = aggregate_accuracy_from_finished(db, since=None)
    roll_30d = aggregate_accuracy_from_finished(db, since=since_30d)
    calibration = aggregate_calibration_from_finished(db, since=None)
    settings = get_settings()
    model_dir = (settings.model_artifact_dir or settings.explanation_model_dir or "").strip()
    metrics = load_metrics_json(model_dir) if model_dir else None
    return {
        "audit_version": "1.0",
        "computed_at_iso": now.isoformat(),
        "accuracy_all_time": accuracy,
        "accuracy_rolling_30d": roll_30d,
        "calibration": calibration,
        "model": {
            "publish_ready": bool((metrics or {}).get("publish_ready")),
            "status": (metrics or {}).get("status", "warming"),
            "trained_at": (metrics or {}).get("trained_at"),
        },
        "methodology": methodology_blurb(),
        "contact": "accuracy@octobetiq.com",
    }


@router.get("/model-vs-market")
async def get_model_vs_market(db: Session = Depends(get_db)):
    """
    Model accuracy vs live market consensus on upcoming games (I64).
    Display-only — supports web dashboard and in-app transparency.
    """
    return build_model_vs_market_summary(db)


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
