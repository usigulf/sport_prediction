"""Per-user Brier score vs model on the same games (I92) and CLV rollup (I63)."""
from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.constants.soccer import SOCCER_LEAGUES_SET
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user_pick import UserPick
from app.services.odds_snapshot_service import compute_clv_for_pick
from app.services.trust_metrics_service import (
    implied_draw_probability,
    select_pregame_prediction_for_accuracy,
)

FINISHED_STATUSES = ("finished", "final")
VALID_OUTCOMES = frozenset({"home", "away", "draw"})


def actual_outcome(game: Game) -> str | None:
    if game.status not in FINISHED_STATUSES:
        return None
    hs = game.home_score or 0
    aws = game.away_score or 0
    if hs == aws:
        return "draw"
    return "home" if hs > aws else "away"


def outcome_hit(outcome: str, game: Game) -> int | None:
    actual = actual_outcome(game)
    if actual is None:
        return None
    return 1 if outcome.lower() == actual else 0


def model_probability_for_outcome(game: Game, pred: Prediction, outcome: str) -> float | None:
    hp = float(pred.home_win_probability)
    ap = float(pred.away_win_probability)
    o = outcome.lower()
    league = (game.league or "").lower()
    if o == "home":
        return hp
    if o == "away":
        return ap
    if o == "draw":
        if league in SOCCER_LEAGUES_SET:
            return implied_draw_probability(hp, ap)
        return None
    return None


def record_user_pick(
    db: Session,
    *,
    user_id: UUID,
    game: Game,
    outcome: str,
    probability: float,
    market_home_implied: float | None = None,
    market_away_implied: float | None = None,
) -> UserPick:
    o = outcome.lower().strip()
    if o not in VALID_OUTCOMES:
        raise ValueError("outcome must be home, away, or draw")
    if game.status in FINISHED_STATUSES:
        raise ValueError("Cannot pick a finished game")
    p = float(probability)
    if p < 0.01 or p > 0.99:
        raise ValueError("probability must be between 0.01 and 0.99")

    league = (game.league or "").lower()
    if o == "draw" and league not in SOCCER_LEAGUES_SET:
        raise ValueError("draw picks are only supported for soccer leagues")

    existing = (
        db.query(UserPick)
        .filter(UserPick.user_id == user_id, UserPick.game_id == game.id)
        .first()
    )
    if existing:
        existing.outcome = o
        existing.probability = p
        existing.market_home_implied_prob = market_home_implied
        existing.market_away_implied_prob = market_away_implied
        db.commit()
        db.refresh(existing)
        return existing

    pick = UserPick(
        user_id=user_id,
        game_id=game.id,
        outcome=o,
        probability=p,
        market_home_implied_prob=market_home_implied,
        market_away_implied_prob=market_away_implied,
    )
    db.add(pick)
    db.commit()
    db.refresh(pick)
    return pick


def build_user_brier_summary(db: Session, user_id: UUID) -> dict[str, Any]:
    picks = (
        db.query(UserPick)
        .options(joinedload(UserPick.game))
        .filter(UserPick.user_id == user_id)
        .all()
    )
    scored = 0
    user_brier_sum = 0.0
    model_brier_sum = 0.0
    correct = 0
    clv_values: list[float] = []
    clv_scored = 0

    for pick in picks:
        game = pick.game
        if game is None or game.status not in FINISHED_STATUSES:
            continue
        hit = outcome_hit(pick.outcome, game)
        if hit is None:
            continue
        pred = select_pregame_prediction_for_accuracy(db, game)
        if pred is None:
            continue
        user_p = float(pick.probability)
        model_p = model_probability_for_outcome(game, pred, pick.outcome)
        if model_p is None:
            continue
        scored += 1
        if hit:
            correct += 1
        user_brier_sum += (user_p - hit) ** 2
        model_brier_sum += (model_p - hit) ** 2

        clv_row = compute_clv_for_pick(
            db,
            game=game,
            outcome=pick.outcome,
            pick_home_implied=float(pick.market_home_implied_prob) if pick.market_home_implied_prob is not None else None,
            pick_away_implied=float(pick.market_away_implied_prob) if pick.market_away_implied_prob is not None else None,
        )
        if clv_row is not None:
            clv_scored += 1
            clv_values.append(float(clv_row["clv"]))

    pending = len(picks) - scored
    return {
        "total_picks": len(picks),
        "scored_picks": scored,
        "pending_picks": max(0, pending),
        "correct": correct,
        "accuracy_pct": round(100.0 * correct / scored, 1) if scored else None,
        "user_brier": round(user_brier_sum / scored, 4) if scored else None,
        "model_brier": round(model_brier_sum / scored, 4) if scored else None,
        "brier_delta": round((user_brier_sum - model_brier_sum) / scored, 4) if scored else None,
        "clv": {
            "scored_picks": clv_scored,
            "avg_clv": round(sum(clv_values) / len(clv_values), 4) if clv_values else None,
            "positive_clv_pct": round(100.0 * sum(1 for v in clv_values if v > 0) / len(clv_values), 1)
            if clv_values
            else None,
        },
        "methodology": (
            "Brier score averages (probability − outcome)² on finished games where you recorded a pick. "
            "Model Brier uses the model's probability on your chosen outcome (not the model's own pick). "
            "Lower is better. CLV compares closing consensus implied probability to odds at pick time."
        ),
    }
