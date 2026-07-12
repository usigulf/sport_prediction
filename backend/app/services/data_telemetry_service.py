"""
Data lineage, freshness, provider-error, and feature-coverage telemetry (audit #13).

Aggregates standings / feature / odds / ledger ages, expected-feature coverage,
persisted sync events, and per-game replay payloads from existing PIT tables.
"""
from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.forecast_ledger_entry import ForecastLedgerEntry
from app.models.game import Game
from app.models.game_feature_snapshot import GameFeatureSnapshot
from app.models.odds_snapshot import OddsSnapshot
from app.models.prediction import Prediction
from app.models.provider_sync_event import ProviderSyncEvent
from app.models.team_standing import TeamStanding
from app.services.model_training import FEATURE_COLUMNS
from app.services.trust_metrics_service import league_data_coverage

logger = logging.getLogger(__name__)

# Informational SLO thresholds (hours) — not hard gates.
STANDINGS_STALE_HOURS = 36.0
FEATURES_STALE_HOURS = 24.0
ODDS_STALE_HOURS = 12.0
LEDGER_STALE_HOURS = 24.0


def _aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _hours_ago(dt: datetime | None, now: datetime) -> float | None:
    aware = _aware(dt)
    if not aware:
        return None
    return max(0.0, (now - aware).total_seconds() / 3600.0)


def _iso(dt: datetime | None) -> str | None:
    aware = _aware(dt)
    return aware.isoformat() if aware else None


def _classify_error(errors: list[str] | None) -> tuple[str | None, str | None]:
    if not errors:
        return None, None
    detail = "; ".join(str(e) for e in errors[:5])[:2000]
    joined = " ".join(errors).lower()
    if "api key" in joined or "not set" in joined:
        code = "missing_credentials"
    elif "not supported" in joined or "not configured" in joined:
        code = "misconfigured"
    elif "commit failed" in joined:
        code = "db_commit"
    elif "fetch failed" in joined or "empty" in joined:
        code = "provider_empty"
    else:
        code = "provider_error"
    return code, detail


def _observe_prometheus(
    *,
    provider: str,
    job: str,
    league: str | None,
    ok: bool,
    error_code: str | None,
) -> None:
    try:
        from app.monitoring.prometheus_metrics import (
            PROVIDER_ERRORS_TOTAL,
            PROVIDER_SYNC_TOTAL,
        )

        status = "ok" if ok else "error"
        PROVIDER_SYNC_TOTAL.labels(
            provider=provider or "unknown",
            job=job or "unknown",
            league=(league or "all"),
            status=status,
        ).inc()
        if not ok and error_code:
            PROVIDER_ERRORS_TOTAL.labels(
                provider=provider or "unknown",
                reason=error_code,
            ).inc()
    except Exception:
        logger.debug("prometheus provider sync observe skipped", exc_info=True)


def record_provider_sync_event(
    db: Session,
    *,
    provider: str,
    job: str,
    league: str | None = None,
    ok: bool,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
    duration_ms: int | None = None,
    rows_touched: int | None = None,
    errors: list[str] | None = None,
    error_code: str | None = None,
    error_detail: str | None = None,
    commit: bool = True,
) -> ProviderSyncEvent:
    """Persist one sync attempt and bump Prometheus counters."""
    now = datetime.now(timezone.utc)
    started = _aware(started_at) or now
    finished = _aware(finished_at) or now
    if duration_ms is None:
        duration_ms = max(0, int((finished - started).total_seconds() * 1000))
    if not ok and error_code is None:
        error_code, inferred_detail = _classify_error(errors)
        if error_detail is None:
            error_detail = inferred_detail
    elif error_detail is None and errors:
        _, error_detail = _classify_error(errors)

    event = ProviderSyncEvent(
        provider=(provider or "unknown")[:40],
        job=(job or "unknown")[:64],
        league=(league[:64] if league else None),
        ok=bool(ok),
        started_at=started,
        finished_at=finished,
        duration_ms=duration_ms,
        rows_touched=rows_touched,
        error_code=(error_code[:64] if error_code else None),
        error_detail=error_detail,
    )
    db.add(event)
    if commit:
        db.commit()
        db.refresh(event)
    else:
        db.flush()

    _observe_prometheus(
        provider=event.provider,
        job=event.job,
        league=event.league,
        ok=event.ok,
        error_code=event.error_code,
    )
    return event


def record_sync_result(
    db: Session,
    *,
    provider: str,
    job: str,
    league: str | None,
    started_at: datetime,
    result: Any,
) -> ProviderSyncEvent:
    """Normalize SyncResult-like objects into a persisted event."""
    finished = datetime.now(timezone.utc)
    errors = list(getattr(result, "errors", None) or [])
    rows = (
        getattr(result, "games_upserted", None)
        or getattr(result, "upserted", None)
        or getattr(result, "rows_fetched", None)
        or getattr(result, "rows_seen", None)
    )
    ok = len(errors) == 0
    return record_provider_sync_event(
        db,
        provider=provider,
        job=job,
        league=league or getattr(result, "app_league", None) or getattr(result, "league", None),
        ok=ok,
        started_at=started_at,
        finished_at=finished,
        rows_touched=int(rows) if rows is not None else None,
        errors=errors,
    )


def feature_coverage_from_snapshots(
    db: Session,
    *,
    sample_limit: int = 50,
    expected: list[str] | None = None,
) -> dict[str, Any]:
    """Fraction of expected model features present in recent PIT snapshots."""
    cols = list(expected or FEATURE_COLUMNS)
    rows = (
        db.query(GameFeatureSnapshot)
        .order_by(desc(GameFeatureSnapshot.captured_at))
        .limit(sample_limit)
        .all()
    )
    if not rows:
        return {
            "expected_features": cols,
            "sample_size": 0,
            "mean_coverage_pct": None,
            "per_feature_present_pct": {c: None for c in cols},
            "note": "No feature snapshots yet — run prediction jobs after schedule sync.",
        }

    present_counts = {c: 0 for c in cols}
    coverage_scores: list[float] = []
    for row in rows:
        try:
            feats = json.loads(row.features_json or "{}")
        except (TypeError, ValueError):
            feats = {}
        if not isinstance(feats, dict):
            feats = {}
        hit = 0
        for c in cols:
            if c in feats and feats[c] is not None:
                present_counts[c] += 1
                hit += 1
        coverage_scores.append(100.0 * hit / len(cols) if cols else 0.0)

    n = len(rows)
    return {
        "expected_features": cols,
        "sample_size": n,
        "mean_coverage_pct": round(sum(coverage_scores) / n, 2),
        "per_feature_present_pct": {
            c: round(100.0 * present_counts[c] / n, 2) for c in cols
        },
        "note": "Coverage vs FEATURE_COLUMNS used by sklearn inference.",
    }


def freshness_snapshot(db: Session, *, now: datetime | None = None) -> dict[str, Any]:
    """Latest ages for standings, features, odds, and forecast ledger."""
    now = now or datetime.now(timezone.utc)
    standings_latest = db.query(func.max(TeamStanding.updated_at)).scalar()
    features_latest = db.query(func.max(GameFeatureSnapshot.captured_at)).scalar()
    odds_latest = db.query(func.max(OddsSnapshot.captured_at)).scalar()
    ledger_latest = db.query(func.max(ForecastLedgerEntry.wall_clock_at)).scalar()

    def pack(label: str, dt: datetime | None, stale_hours: float) -> dict[str, Any]:
        hours = _hours_ago(dt, now)
        return {
            "resource": label,
            "latest_at_iso": _iso(dt),
            "age_hours": round(hours, 3) if hours is not None else None,
            "stale_after_hours": stale_hours,
            "is_stale": hours is None or hours > stale_hours,
        }

    resources = [
        pack("team_standings", standings_latest, STANDINGS_STALE_HOURS),
        pack("game_feature_snapshots", features_latest, FEATURES_STALE_HOURS),
        pack("odds_snapshots", odds_latest, ODDS_STALE_HOURS),
        pack("forecast_ledger_entries", ledger_latest, LEDGER_STALE_HOURS),
    ]

    try:
        from app.monitoring.prometheus_metrics import DATA_FRESHNESS_HOURS

        for row in resources:
            age = row["age_hours"]
            if age is not None:
                DATA_FRESHNESS_HOURS.labels(resource=row["resource"], league="all").set(age)
    except Exception:
        logger.debug("prometheus freshness gauge skipped", exc_info=True)

    return {
        "computed_at_iso": now.isoformat(),
        "resources": resources,
        "any_stale": any(r["is_stale"] for r in resources),
    }


def recent_provider_errors(
    db: Session,
    *,
    limit: int = 20,
    since_hours: int = 72,
) -> list[dict[str, Any]]:
    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    rows = (
        db.query(ProviderSyncEvent)
        .filter(ProviderSyncEvent.ok.is_(False))
        .filter(ProviderSyncEvent.started_at >= since)
        .order_by(desc(ProviderSyncEvent.started_at))
        .limit(limit)
        .all()
    )
    out = []
    for row in rows:
        out.append(
            {
                "id": str(row.id),
                "provider": row.provider,
                "job": row.job,
                "league": row.league,
                "started_at_iso": _iso(row.started_at),
                "error_code": row.error_code,
                "error_detail": row.error_detail,
                "duration_ms": row.duration_ms,
            }
        )
    return out


def provider_sync_summary(db: Session, *, since_hours: int = 72) -> dict[str, Any]:
    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    total = (
        db.query(func.count(ProviderSyncEvent.id))
        .filter(ProviderSyncEvent.started_at >= since)
        .scalar()
        or 0
    )
    failed = (
        db.query(func.count(ProviderSyncEvent.id))
        .filter(ProviderSyncEvent.started_at >= since)
        .filter(ProviderSyncEvent.ok.is_(False))
        .scalar()
        or 0
    )
    by_provider = (
        db.query(
            ProviderSyncEvent.provider,
            ProviderSyncEvent.ok,
            func.count(ProviderSyncEvent.id),
        )
        .filter(ProviderSyncEvent.started_at >= since)
        .group_by(ProviderSyncEvent.provider, ProviderSyncEvent.ok)
        .all()
    )
    providers: dict[str, dict[str, int]] = {}
    for provider, ok, cnt in by_provider:
        bucket = providers.setdefault(provider, {"ok": 0, "error": 0})
        bucket["ok" if ok else "error"] = int(cnt)
    return {
        "window_hours": since_hours,
        "total_events": int(total),
        "failed_events": int(failed),
        "by_provider": providers,
        "recent_errors": recent_provider_errors(db, limit=10, since_hours=since_hours),
    }


def build_data_telemetry_summary(db: Session) -> dict[str, Any]:
    """Public /stats/data-telemetry payload."""
    now = datetime.now(timezone.utc)
    coverage = league_data_coverage(db)
    return {
        "audit_task": 13,
        "computed_at_iso": now.isoformat(),
        "freshness": freshness_snapshot(db, now=now),
        "feature_coverage": feature_coverage_from_snapshots(db),
        "provider_sync": provider_sync_summary(db),
        "standings_coverage": {
            "leagues_with_standings": len(coverage),
            "leagues": coverage,
        },
        "slo_note": (
            "Stale thresholds are informational ops SLOs for the soccer wedge — "
            "not App Store marketing claims."
        ),
    }


def build_data_telemetry_detail(db: Session, *, error_limit: int = 50) -> dict[str, Any]:
    """Ops detail behind cron secret."""
    summary = build_data_telemetry_summary(db)
    summary["recent_errors"] = recent_provider_errors(db, limit=error_limit, since_hours=168)
    summary["recent_events"] = [
        {
            "id": str(row.id),
            "provider": row.provider,
            "job": row.job,
            "league": row.league,
            "ok": row.ok,
            "started_at_iso": _iso(row.started_at),
            "duration_ms": row.duration_ms,
            "rows_touched": row.rows_touched,
            "error_code": row.error_code,
        }
        for row in (
            db.query(ProviderSyncEvent)
            .order_by(desc(ProviderSyncEvent.started_at))
            .limit(error_limit)
            .all()
        )
    ]
    return summary


def replay_features_for_prediction(
    db: Session,
    prediction_id: UUID,
) -> dict[str, Any] | None:
    """Return the PIT feature vector linked to a prediction (offline replay input)."""
    snap = (
        db.query(GameFeatureSnapshot)
        .filter(GameFeatureSnapshot.prediction_id == prediction_id)
        .order_by(desc(GameFeatureSnapshot.captured_at))
        .first()
    )
    if not snap:
        return None
    try:
        feats = json.loads(snap.features_json or "{}")
    except (TypeError, ValueError):
        feats = {}
    return {
        "prediction_id": str(prediction_id),
        "captured_at_iso": _iso(snap.captured_at),
        "feature_source": snap.feature_source,
        "model_version": snap.model_version,
        "features": feats if isinstance(feats, dict) else {},
        "expected_features": list(FEATURE_COLUMNS),
        "missing_features": [
            c for c in FEATURE_COLUMNS if not isinstance(feats, dict) or c not in feats
        ],
    }


def build_game_lineage(db: Session, game_id: UUID, *, limit: int = 20) -> dict[str, Any]:
    """
    Ordered lineage for one game: odds → features → predictions → ledger.
    Includes a replay payload for the latest prediction with a feature snapshot.
    """
    game = db.query(Game).filter(Game.id == game_id).first()
    if not game:
        return {"game_id": str(game_id), "found": False}

    odds = (
        db.query(OddsSnapshot)
        .filter(OddsSnapshot.game_id == game_id)
        .order_by(desc(OddsSnapshot.captured_at))
        .limit(limit)
        .all()
    )
    features = (
        db.query(GameFeatureSnapshot)
        .filter(GameFeatureSnapshot.game_id == game_id)
        .order_by(desc(GameFeatureSnapshot.captured_at))
        .limit(limit)
        .all()
    )
    preds = (
        db.query(Prediction)
        .filter(Prediction.game_id == game_id)
        .order_by(desc(Prediction.created_at))
        .limit(limit)
        .all()
    )
    ledger = (
        db.query(ForecastLedgerEntry)
        .filter(ForecastLedgerEntry.game_id == game_id)
        .order_by(desc(ForecastLedgerEntry.sequence))
        .limit(limit)
        .all()
    )

    timeline: list[dict[str, Any]] = []
    for row in odds:
        timeline.append(
            {
                "kind": "odds_snapshot",
                "at_iso": _iso(row.captured_at),
                "provider": row.provider,
                "is_closing": bool(row.is_closing),
                "home_implied_prob": float(row.home_implied_prob)
                if row.home_implied_prob is not None
                else None,
                "away_implied_prob": float(row.away_implied_prob)
                if row.away_implied_prob is not None
                else None,
            }
        )
    for row in features:
        try:
            feats = json.loads(row.features_json or "{}")
            fcount = len(feats) if isinstance(feats, dict) else 0
        except (TypeError, ValueError):
            fcount = 0
        timeline.append(
            {
                "kind": "feature_snapshot",
                "at_iso": _iso(row.captured_at),
                "feature_source": row.feature_source,
                "model_version": row.model_version,
                "prediction_id": str(row.prediction_id) if row.prediction_id else None,
                "feature_count": fcount,
            }
        )
    for row in preds:
        timeline.append(
            {
                "kind": "prediction",
                "at_iso": _iso(row.created_at),
                "prediction_id": str(row.id),
                "model_version": row.model_version,
                "prediction_source": getattr(row, "prediction_source", None),
                "prediction_type": getattr(row, "prediction_type", None),
                "home_win_probability": float(row.home_win_probability),
                "away_win_probability": float(row.away_win_probability),
            }
        )
    for row in ledger:
        timeline.append(
            {
                "kind": "forecast_ledger",
                "at_iso": _iso(row.issued_at),
                "sequence": int(row.sequence),
                "content_hash": row.content_hash,
                "prediction_id": str(row.prediction_id) if row.prediction_id else None,
                "prediction_source": row.prediction_source,
                "model_version": row.model_version,
            }
        )

    timeline.sort(key=lambda x: x.get("at_iso") or "", reverse=True)

    replay = None
    for pred in preds:
        replay = replay_features_for_prediction(db, pred.id)
        if replay:
            break

    return {
        "game_id": str(game_id),
        "found": True,
        "league": game.league,
        "scheduled_time_iso": _iso(game.scheduled_time),
        "status": game.status,
        "counts": {
            "odds_snapshots": len(odds),
            "feature_snapshots": len(features),
            "predictions": len(preds),
            "ledger_entries": len(ledger),
        },
        "timeline": timeline,
        "replay": replay,
        "note": (
            "Replay returns the PIT feature vector for offline re-scoring; "
            "full Parquet warehouse export is out of scope for this API."
        ),
    }


class timed_sync:
    """Context helper: wall-clock start for sync recording."""

    def __init__(self) -> None:
        self.started_at = datetime.now(timezone.utc)
        self._t0 = time.perf_counter()

    @property
    def duration_ms(self) -> int:
        return int((time.perf_counter() - self._t0) * 1000)
