"""Community pick consensus vs model (I93)."""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.models.user_pick import UserPick
from app.services.prediction_service import PredictionService
from app.services.trust_metrics_service import (
    prediction_correct_vs_result,
    select_pregame_prediction_for_accuracy,
)
from app.services.user_brier_service import actual_outcome, outcome_hit

FINISHED = ("finished", "final")
MIN_PICKS_UPCOMING = 3


def _majority_outcome(counts: Counter) -> str | None:
    if not counts:
        return None
    outcome, n = counts.most_common(1)[0]
    return outcome if n > 0 else None


def build_community_vs_model_summary(db: Session, *, upcoming_limit: int = 10) -> dict[str, Any]:
    ps = PredictionService(db)
    upcoming_games = (
        db.query(Game)
        .filter(Game.status == "scheduled")
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .order_by(Game.scheduled_time.asc())
        .limit(100)
        .all()
    )

    upcoming_rows: list[dict[str, Any]] = []
    for game in upcoming_games:
        picks = (
            db.query(UserPick)
            .filter(UserPick.game_id == game.id)
            .all()
        )
        if len(picks) < MIN_PICKS_UPCOMING:
            continue
        outcome_counts: Counter = Counter(p.outcome for p in picks)
        community_pick = _majority_outcome(outcome_counts)
        pred = ps.get_latest_prediction(str(game.id))
        if not pred or not community_pick:
            continue
        model_home = float(pred.home_win_probability)
        model_away = float(pred.away_win_probability)
        model_pick = "home" if model_home >= model_away else "away"
        avg_prob = sum(float(p.probability) for p in picks if p.outcome == community_pick) / max(
            1, outcome_counts[community_pick]
        )
        upcoming_rows.append(
            {
                "game_id": str(game.id),
                "league": game.league,
                "community_pick": community_pick,
                "community_pick_count": len(picks),
                "community_avg_probability": round(avg_prob, 4),
                "model_pick": model_pick,
                "aligned": community_pick == model_pick,
            }
        )
        if len(upcoming_rows) >= upcoming_limit:
            break

    finished_picks = (
        db.query(UserPick)
        .options(joinedload(UserPick.game))
        .all()
    )
    by_game: dict[UUID, list[UserPick]] = defaultdict(list)
    for p in finished_picks:
        if p.game and p.game.status in FINISHED:
            by_game[p.game_id].append(p)

    community_correct = 0
    model_correct = 0
    scored = 0
    for game_id, picks in by_game.items():
        if len(picks) < MIN_PICKS_UPCOMING:
            continue
        game = picks[0].game
        counts = Counter(p.outcome for p in picks)
        majority = _majority_outcome(counts)
        if not majority:
            continue
        pred = select_pregame_prediction_for_accuracy(db, game)
        if not pred:
            continue
        scored += 1
        if outcome_hit(majority, game):
            community_correct += 1
        if prediction_correct_vs_result(game, pred):
            model_correct += 1

    return {
        "upcoming": upcoming_rows,
        "upcoming_count": len(upcoming_rows),
        "finished_comparison": {
            "games_scored": scored,
            "community_correct": community_correct,
            "model_correct": model_correct,
            "community_accuracy_pct": round(100.0 * community_correct / scored, 1) if scored else None,
            "model_accuracy_pct": round(100.0 * model_correct / scored, 1) if scored else None,
        },
        "min_picks_per_game": MIN_PICKS_UPCOMING,
        "disclaimer": (
            "Community consensus is the majority outcome among user-recorded picks — "
            "informational only, not betting advice."
        ),
    }
