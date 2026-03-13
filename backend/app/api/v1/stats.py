"""
Stats endpoints: model accuracy (prediction vs outcome)
"""
from collections import defaultdict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.game import Game
from app.models.prediction import Prediction

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/accuracy")
async def get_accuracy(db: Session = Depends(get_db)):
    """
    Historical accuracy: for finished games with a prediction, was the predicted winner correct?
    Public endpoint (no auth) for transparency.
    """
    # Games that have finished (have final scores). Seed uses "finished"; support both.
    finished = (
        db.query(Game)
        .filter(Game.status.in_(["finished", "final"]))
        .all()
    )
    total = 0
    correct = 0
    by_league = defaultdict(lambda: {"total": 0, "correct": 0})

    for game in finished:
        # Latest prediction for this game
        pred = (
            db.query(Prediction)
            .filter(Prediction.game_id == game.id)
            .order_by(desc(Prediction.created_at))
            .first()
        )
        if not pred:
            continue

        total += 1
        predicted_home_win = float(pred.home_win_probability) > float(pred.away_win_probability)
        actual_home_win = (game.home_score or 0) > (game.away_score or 0)
        is_correct = predicted_home_win == actual_home_win
        if is_correct:
            correct += 1

        league = game.league or "other"
        by_league[league]["total"] += 1
        if is_correct:
            by_league[league]["correct"] += 1

    # Build by_league with pct
    by_league_out = {}
    for league, counts in by_league.items():
        t, c = counts["total"], counts["correct"]
        by_league_out[league] = {
            "total": t,
            "correct": c,
            "accuracy_pct": round(100.0 * c / t, 1) if t else 0,
        }

    accuracy_pct = round(100.0 * correct / total, 1) if total else 0

    return {
        "total_games": total,
        "correct": correct,
        "accuracy_pct": accuracy_pct,
        "by_league": by_league_out,
    }
