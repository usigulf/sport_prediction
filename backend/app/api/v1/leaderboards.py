"""
Leaderboards: user ranking by prediction-view accuracy (games they viewed that finished).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict

from app.database import get_db
from app.api.deps import get_current_user_optional
from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.models.user_prediction_view import UserPredictionView

router = APIRouter(prefix="/leaderboards", tags=["leaderboards"])


def _mask_email(email: str) -> str:
    """Mask email for public leaderboard: 'u***@x.com' style."""
    if not email or "@" not in email:
        return "Anonymous"
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        return f"{local}***@{domain}"
    return f"{local[0]}***@{domain}"


@router.get("")
async def get_leaderboards(
    period: str = Query("monthly", description="weekly | monthly | all"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Leaderboard: users ranked by accuracy of finished games they viewed (prediction vs outcome).
    period: weekly (last 7 days), monthly (last 30 days), or all (no time filter).
    """
    now = datetime.now()
    if period == "weekly":
        since = now - timedelta(days=7)
    elif period == "monthly":
        since = now - timedelta(days=30)
    else:
        since = None

    # Finished games
    finished_games = (
        db.query(Game)
        .filter(Game.status.in_(["finished", "final"]))
        .all()
    )
    game_ids = {g.id for g in finished_games}
    if not game_ids:
        return {"period": period, "entries": [], "count": 0}

    # Latest prediction per game
    pred_by_game = {}
    for game in finished_games:
        pred = (
            db.query(Prediction)
            .filter(Prediction.game_id == game.id)
            .order_by(desc(Prediction.created_at))
            .first()
        )
        if pred:
            pred_by_game[game.id] = (game, pred)

    # UserPredictionView for these games (optionally since date)
    q = (
        db.query(UserPredictionView)
        .filter(UserPredictionView.game_id.in_(game_ids))
    )
    if since:
        q = q.filter(UserPredictionView.viewed_at >= since)
    views = q.all()

    # Per-user: count correct / total (one view per user per game counts)
    user_games = defaultdict(set)
    for v in views:
        if v.game_id not in pred_by_game:
            continue
        game, pred = pred_by_game[v.game_id]
        predicted_home = float(pred.home_win_probability) > float(pred.away_win_probability)
        actual_home = (game.home_score or 0) > (game.away_score or 0)
        is_correct = predicted_home == actual_home
        user_games[v.user_id].add((v.game_id, is_correct))

    # Dedupe: one (game, correct) per user (latest view wins if multiple views)
    user_stats = {}
    for user_id, pairs in user_games.items():
        correct = sum(1 for _, c in pairs if c)
        total = len(pairs)
        if total > 0:
            user_stats[user_id] = {"correct": correct, "total": total}

    if not user_stats:
        return {"period": period, "entries": [], "count": 0}

    # Sort by accuracy_pct desc, then correct desc
    sorted_users = sorted(
        user_stats.items(),
        key=lambda x: (100.0 * x[1]["correct"] / x[1]["total"], x[1]["correct"]),
        reverse=True,
    )[:limit]

    # Load user emails for display
    user_ids = [u[0] for u in sorted_users]
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}

    entries = []
    for rank, (user_id, st) in enumerate(sorted_users, start=1):
        u = users.get(user_id)
        display_name = _mask_email(u.email) if u else "Anonymous"
        total = st["total"]
        correct = st["correct"]
        accuracy_pct = round(100.0 * correct / total, 1) if total else 0
        entries.append({
            "rank": rank,
            "user_id": str(user_id),
            "display_name": display_name,
            "correct": correct,
            "total": total,
            "accuracy_pct": accuracy_pct,
        })
        if current_user and current_user.id == user_id:
            entries[-1]["is_me"] = True
        else:
            entries[-1]["is_me"] = False

    return {"period": period, "entries": entries, "count": len(entries)}
