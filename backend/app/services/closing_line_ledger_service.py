"""Closing-line ledger: freeze pre-kickoff odds and score model vs market (audit #8/#10).

Odds snapshots already accumulate from market fetches. This module:
1) Marks (or creates) a single closing snapshot per game near kickoff
2) Evaluates sklearn pre-game picks against that closing consensus on finished games
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import desc
from sqlalchemy.orm import Session, joinedload

from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.models.odds_snapshot import OddsSnapshot
from app.models.prediction import Prediction
from app.services.odds_snapshot_service import (
    _as_utc,
    closing_snapshot_before_kickoff,
    maybe_record_odds_snapshot,
)
from app.utils.prediction_source import (
    classify_prediction_source,
    PREDICTION_SOURCE_SKLEARN,
)

# Minimum finished games with closing + sklearn pick to unlock public_charge market gate.
MARKET_BASELINE_MIN_SCORED = 50
EPS = 1e-6


def get_closing_snapshot(db: Session, game: Game) -> OddsSnapshot | None:
    """Prefer explicitly frozen closing row; fall back to last pre-kickoff snapshot."""
    marked = (
        db.query(OddsSnapshot)
        .filter(OddsSnapshot.game_id == game.id, OddsSnapshot.is_closing.is_(True))
        .order_by(desc(OddsSnapshot.captured_at))
        .first()
    )
    if marked is not None:
        return marked
    return closing_snapshot_before_kickoff(db, game)


def mark_closing_snapshot(db: Session, game: Game) -> OddsSnapshot | None:
    """
    Designate the last pre-kickoff snapshot as closing for this game.
    Clears any prior is_closing flags on the same game.
    """
    snap = closing_snapshot_before_kickoff(db, game)
    if snap is None:
        return None
    db.query(OddsSnapshot).filter(
        OddsSnapshot.game_id == game.id,
        OddsSnapshot.is_closing.is_(True),
    ).update({"is_closing": False}, synchronize_session=False)
    snap.is_closing = True
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


def freeze_closing_lines(
    db: Session,
    *,
    lookahead_minutes: int = 30,
    after_kickoff_minutes: int = 180,
    fetch_missing: bool = True,
) -> dict[str, Any]:
    """
    Freeze closing lines for games in a kickoff window.

    Window: kickoff in the next ``lookahead_minutes`` OR kicked off within
    ``after_kickoff_minutes`` (catch games that just started).
    Optionally fetch live odds once when no snapshot exists yet.
    """
    now = datetime.now(timezone.utc)
    # Compare with naive UTC when DB stores naive timestamps.
    now_naive = now.replace(tzinfo=None)
    start = now_naive - timedelta(minutes=max(0, after_kickoff_minutes))
    end = now_naive + timedelta(minutes=max(0, lookahead_minutes))

    games = (
        db.query(Game)
        .filter(
            Game.scheduled_time >= start,
            Game.scheduled_time <= end,
            Game.status.in_(("scheduled", "live", "finished", "final")),
        )
        .all()
    )

    marked = 0
    fetched = 0
    skipped = 0
    for game in games:
        existing = (
            db.query(OddsSnapshot)
            .filter(OddsSnapshot.game_id == game.id, OddsSnapshot.is_closing.is_(True))
            .first()
        )
        if existing is not None:
            skipped += 1
            continue
        snap = mark_closing_snapshot(db, game)
        if snap is None and fetch_missing:
            try:
                from app.services.odds_service import get_market_odds_for_game

                payload = get_market_odds_for_game(db, game)
                if payload.get("available"):
                    maybe_record_odds_snapshot(db, game, payload)
                    fetched += 1
                    snap = mark_closing_snapshot(db, game)
            except Exception:
                snap = None
        if snap is not None:
            marked += 1
        else:
            skipped += 1

    return {
        "window_start_iso": start.replace(tzinfo=timezone.utc).isoformat(),
        "window_end_iso": end.replace(tzinfo=timezone.utc).isoformat(),
        "games_considered": len(games),
        "closing_marked": marked,
        "odds_fetched": fetched,
        "skipped": skipped,
    }


def _pre_game_prediction(db: Session, game_id) -> Prediction | None:
    return (
        db.query(Prediction)
        .filter(Prediction.game_id == game_id)
        .filter(
            (Prediction.prediction_type == "pre_game")
            | (Prediction.prediction_type.is_(None))
        )
        .order_by(desc(Prediction.created_at))
        .first()
    )


def _binary_log_loss(y_home_win: int, p_home: float) -> float:
    p = min(1.0 - EPS, max(EPS, float(p_home)))
    if y_home_win == 1:
        return -math.log(p)
    return -math.log(1.0 - p)


def _soccer_1x2_log_loss(
    outcome: str,
    *,
    p_home: float,
    p_away: float,
) -> float | None:
    p_draw = max(0.0, 1.0 - float(p_home) - float(p_away))
    total = float(p_home) + float(p_away) + p_draw
    if total <= 0:
        return None
    p_home, p_away, p_draw = p_home / total, p_away / total, p_draw / total
    if outcome == "home":
        return -math.log(min(1.0 - EPS, max(EPS, p_home)))
    if outcome == "away":
        return -math.log(min(1.0 - EPS, max(EPS, p_away)))
    if outcome == "draw":
        return -math.log(min(1.0 - EPS, max(EPS, p_draw)))
    return None


def evaluate_model_vs_closing(
    db: Session,
    *,
    since_days: int | None = None,
    leagues: list[str] | None = None,
    default_model_version: str = "v1.0.0",
) -> dict[str, Any]:
    """
    Score sklearn pre-game predictions against frozen (or last pre-kickoff) closing odds.
    """
    q = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.status.in_(("finished", "final")))
        .filter(Game.home_score.isnot(None), Game.away_score.isnot(None))
    )
    if since_days is not None and since_days > 0:
        cutoff = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=since_days)
        q = q.filter(Game.scheduled_time >= cutoff)
    if leagues:
        q = q.filter(Game.league.in_([lg.lower() for lg in leagues]))

    games = q.order_by(Game.scheduled_time.desc()).limit(2000).all()

    model_ll: list[float] = []
    market_ll: list[float] = []
    skipped = {
        "no_closing": 0,
        "no_prediction": 0,
        "not_sklearn": 0,
        "missing_probs": 0,
        "draw_binary": 0,
    }

    for game in games:
        closing = get_closing_snapshot(db, game)
        if closing is None or closing.home_implied_prob is None:
            skipped["no_closing"] += 1
            continue
        pred = _pre_game_prediction(db, game.id)
        if pred is None:
            skipped["no_prediction"] += 1
            continue
        source = classify_prediction_source(
            pred.model_version,
            default_version=default_model_version,
        )
        if source != PREDICTION_SOURCE_SKLEARN:
            skipped["not_sklearn"] += 1
            continue

        m_home = float(pred.home_win_probability) if pred.home_win_probability is not None else None
        m_away = float(pred.away_win_probability) if pred.away_win_probability is not None else None
        c_home = float(closing.home_implied_prob)
        c_away = float(closing.away_implied_prob) if closing.away_implied_prob is not None else None
        if m_home is None or m_away is None or c_away is None:
            skipped["missing_probs"] += 1
            continue

        hs = int(game.home_score or 0)
        aws = int(game.away_score or 0)
        is_soccer = (game.league or "").lower() in SOCCER_LEAGUES_SET

        if is_soccer:
            if hs > aws:
                outcome = "home"
            elif aws > hs:
                outcome = "away"
            else:
                outcome = "draw"
            m_loss = _soccer_1x2_log_loss(outcome, p_home=m_home, p_away=m_away)
            k_loss = _soccer_1x2_log_loss(outcome, p_home=c_home, p_away=c_away)
            if m_loss is None or k_loss is None:
                skipped["missing_probs"] += 1
                continue
            model_ll.append(m_loss)
            market_ll.append(k_loss)
        else:
            if hs == aws:
                skipped["draw_binary"] += 1
                continue
            y = 1 if hs > aws else 0
            model_ll.append(_binary_log_loss(y, m_home))
            market_ll.append(_binary_log_loss(y, c_home))

    scored = len(model_ll)
    model_mean = round(sum(model_ll) / scored, 4) if scored else None
    market_mean = round(sum(market_ll) / scored, 4) if scored else None
    beats = (
        model_mean is not None
        and market_mean is not None
        and model_mean <= market_mean
    )
    ledger_ready = scored >= MARKET_BASELINE_MIN_SCORED
    closing_marked = (
        db.query(OddsSnapshot).filter(OddsSnapshot.is_closing.is_(True)).count()
    )

    return {
        "ledger_version": "1.0",
        "scored_games": scored,
        "min_scored_for_acceptance": MARKET_BASELINE_MIN_SCORED,
        "ledger_sample_met": ledger_ready,
        "model_mean_log_loss": model_mean,
        "market_mean_log_loss": market_mean,
        "model_beats_or_ties_closing_market": beats if scored else False,
        "closing_snapshots_marked": int(closing_marked),
        "skipped": skipped,
        "acceptance_ready": bool(ledger_ready and beats),
        "detail": (
            f"scored={scored} model_ll={model_mean} market_ll={market_mean} "
            f"beats={beats} marked_closings={closing_marked}"
        ),
    }
