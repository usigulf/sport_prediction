"""
Trust / transparency helpers: how we score predictions vs results, and data coverage signals.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.constants.predictions import PREDICTION_TYPE_INPLAY, PREDICTION_TYPE_PRE_GAME
from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.team_standing import TeamStanding

from app.constants.leagues import PRODUCT_SCOPE_SUMMARY
from app.services.live_prediction_service import INPLAY_VERSION_MARKER


def _kickoff_utc(game: Game) -> datetime | None:
    kickoff = game.scheduled_time
    if not kickoff:
        return None
    if kickoff.tzinfo is None:
        return kickoff.replace(tzinfo=timezone.utc)
    return kickoff


def _legacy_inplay_heuristic(game: Game, pred: Prediction) -> bool:
    """Fallback for rows written before prediction_type column existed."""
    mv = (pred.model_version or "").lower()
    if INPLAY_VERSION_MARKER in mv:
        return True
    kickoff = _kickoff_utc(game)
    if not pred.created_at or not kickoff:
        return False
    created = pred.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    return created >= kickoff


def resolved_prediction_type(game: Game, pred: Prediction) -> str:
    """Effective type for trust metrics (explicit column or legacy inference)."""
    stored = (pred.prediction_type or "").strip().lower()
    if stored in (PREDICTION_TYPE_PRE_GAME, PREDICTION_TYPE_INPLAY):
        return stored
    return PREDICTION_TYPE_INPLAY if _legacy_inplay_heuristic(game, pred) else PREDICTION_TYPE_PRE_GAME


def is_inplay_prediction_row(game: Game, pred: Prediction) -> bool:
    """
    True when a prediction row reflects live-game refresh (excluded from accuracy rollups).
    Uses prediction_type when set; otherwise created_at vs kickoff and model_version marker.
    """
    return resolved_prediction_type(game, pred) == PREDICTION_TYPE_INPLAY


def select_pregame_prediction_for_accuracy(db: Session, game: Game) -> Prediction | None:
    """First stored pre_game prediction (C-06 lock for trust metrics)."""
    preds = (
        db.query(Prediction)
        .filter(Prediction.game_id == game.id)
        .order_by(Prediction.created_at.asc())
        .all()
    )
    for pred in preds:
        if resolved_prediction_type(game, pred) == PREDICTION_TYPE_PRE_GAME:
            return pred
    return None


def implied_draw_probability(home_p: float, away_p: float) -> float:
    s = home_p + away_p
    if s >= 0.999:
        return 0.0
    return max(0.0, 1.0 - s)


def prediction_correct_vs_result(game: Game, pred: Prediction) -> bool:
    """
    Informational accuracy rule (documented in /stats/accuracy methodology):
    - Soccer leagues: 1X2 — predicted outcome is argmax(home, away, implied draw).
    - Other sports: binary home vs away win (ties treated as not matching either side pick).
    """
    hs = game.home_score or 0
    aws = game.away_score or 0
    hp = float(pred.home_win_probability)
    ap = float(pred.away_win_probability)
    league = (game.league or "").lower()

    if league in SOCCER_LEAGUES_SET:
        dp = implied_draw_probability(hp, ap)
        probs = {"home": hp, "away": ap, "draw": dp}
        predicted = max(probs, key=probs.get)
        if hs == aws:
            actual = "draw"
        elif hs > aws:
            actual = "home"
        else:
            actual = "away"
        return predicted == actual

    # Non-soccer: predicted favorite side vs actual winner (no draw arm).
    predicted_home = hp > ap
    if hs == aws:
        return False
    actual_home = hs > aws
    return predicted_home == actual_home


def predicted_outcome_probability(game: Game, pred: Prediction) -> float:
    """Max probability assigned to the predicted 1X2 / binary outcome (for calibration bins)."""
    hp = float(pred.home_win_probability)
    ap = float(pred.away_win_probability)
    league = (game.league or "").lower()
    if league in SOCCER_LEAGUES_SET:
        dp = implied_draw_probability(hp, ap)
        return max(hp, ap, dp)
    return max(hp, ap)


NUM_CALIBRATION_BUCKETS = 10
CALIBRATION_MIN_SAMPLE = 100


def aggregate_calibration_from_finished(
    db: Session,
    *,
    since: datetime | None = None,
) -> dict[str, Any]:
    """
    Reliability diagram data: bucket pre-kickoff predicted outcome probability vs actual hit rate.
    Uses the same pre-game prediction lock and scoring rules as /stats/accuracy.
    """
    q = db.query(Game).filter(Game.status.in_(["finished", "final"]))
    if since is not None:
        q = q.filter(Game.scheduled_time.isnot(None)).filter(Game.scheduled_time >= since)
    finished = q.all()

    bucket_hits: list[list[float]] = [[] for _ in range(NUM_CALIBRATION_BUCKETS)]
    total = 0

    for game in finished:
        pred = select_pregame_prediction_for_accuracy(db, game)
        if not pred:
            continue
        p = min(max(predicted_outcome_probability(game, pred), 0.0), 1.0)
        hit = 1.0 if prediction_correct_vs_result(game, pred) else 0.0
        idx = min(int(p * NUM_CALIBRATION_BUCKETS), NUM_CALIBRATION_BUCKETS - 1)
        bucket_hits[idx].append(hit)
        total += 1

    buckets: list[dict[str, Any]] = []
    for i in range(NUM_CALIBRATION_BUCKETS):
        hits = bucket_hits[i]
        bin_start = round(i / NUM_CALIBRATION_BUCKETS, 2)
        bin_end = round((i + 1) / NUM_CALIBRATION_BUCKETS, 2)
        predicted_mid = round((bin_start + bin_end) / 2, 2)
        count = len(hits)
        actual_rate = round(sum(hits) / count, 4) if count else None
        buckets.append(
            {
                "bin_start": bin_start,
                "bin_end": bin_end,
                "predicted_mid": predicted_mid,
                "count": count,
                "actual_rate": actual_rate,
                "actual_rate_pct": round(actual_rate * 100, 1) if actual_rate is not None else None,
            }
        )

    return {
        "total_scored": total,
        "min_sample": CALIBRATION_MIN_SAMPLE,
        "min_sample_met": total >= CALIBRATION_MIN_SAMPLE,
        "buckets": buckets,
    }


def aggregate_accuracy_from_finished(
    db: Session,
    *,
    since: datetime | None = None,
) -> dict[str, Any]:
    """Shared aggregation for /stats/accuracy (optionally limited to games with scheduled_time >= since)."""
    q = db.query(Game).filter(Game.status.in_(["finished", "final"]))
    if since is not None:
        q = q.filter(Game.scheduled_time.isnot(None)).filter(Game.scheduled_time >= since)
    finished = q.all()

    total = 0
    correct = 0
    by_league: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    by_confidence: dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})

    for game in finished:
        pred = select_pregame_prediction_for_accuracy(db, game)
        if not pred:
            continue

        total += 1
        ok = prediction_correct_vs_result(game, pred)
        if ok:
            correct += 1

        league = game.league or "other"
        by_league[league]["total"] += 1
        if ok:
            by_league[league]["correct"] += 1

        conf = (pred.confidence_level or "unknown").lower()
        if conf not in ("high", "medium", "low"):
            conf = "unknown"
        by_confidence[conf]["total"] += 1
        if ok:
            by_confidence[conf]["correct"] += 1

    def pct(c: int, t: int) -> float:
        return round(100.0 * c / t, 1) if t else 0.0

    by_league_out = {
        lg: {"total": v["total"], "correct": v["correct"], "accuracy_pct": pct(v["correct"], v["total"])}
        for lg, v in by_league.items()
    }
    by_confidence_out = {
        k: {"total": v["total"], "correct": v["correct"], "accuracy_pct": pct(v["correct"], v["total"])}
        for k, v in by_confidence.items()
    }

    return {
        "total_games": total,
        "correct": correct,
        "accuracy_pct": pct(correct, total),
        "by_league": by_league_out,
        "by_confidence": by_confidence_out,
    }


def league_data_coverage(db: Session) -> list[dict[str, Any]]:
    """
    Per-league snapshot: how many standings rows exist and newest update time.
    Used for informational transparency when licensed feeds are partial.
    """
    rows = (
        db.query(TeamStanding.league, func.count(TeamStanding.id), func.max(TeamStanding.updated_at))
        .group_by(TeamStanding.league)
        .all()
    )
    out: list[dict[str, Any]] = []
    for league, cnt, updated in sorted(rows, key=lambda x: x[0]):
        out.append(
            {
                "league": league,
                "standings_rows": int(cnt),
                "standings_last_updated_iso": updated.isoformat() if updated else None,
            }
        )
    return out


def methodology_blurb() -> dict[str, str]:
    return {
        "short": (
            "Informational accuracy only — not betting advice. "
            "Soccer uses 1X2 (home / draw / away); other sports use predicted favorite vs winner."
        ),
        "detail": (
            "For finished games we compare the first pre-kickoff prediction to the final score "
            "(live in-play refreshes are excluded). "
            "Soccer competitions use implied draw probability (residual mass) alongside home and away "
            "so accuracy matches three-way outcomes. Non-soccer games use the higher of home vs away "
            "probability as the predicted side. Confidence buckets group how often each label was "
            "right, not trading performance. Coverage grows as more competition data is licensed and synced. "
            + PRODUCT_SCOPE_SUMMARY
        ),
    }
