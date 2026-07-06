"""
Leaderboard rankings via SQL aggregation (no full-table scans of games or views).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID

from sqlalchemy import Float, and_, case, cast, desc, func
from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.models.user_prediction_view import UserPredictionView

FINISHED_STATUSES = ("finished", "final")
MIN_LEADERBOARD_ACTIVE_USERS = 50


def _leaderboard_meta(eligible_users: int) -> dict[str, int | bool]:
    return {
        "eligible_users": eligible_users,
        "community_warming": eligible_users < MIN_LEADERBOARD_ACTIVE_USERS,
        "min_active_users": MIN_LEADERBOARD_ACTIVE_USERS,
    }


def _mask_email(email: str) -> str:
    """Mask email for public leaderboard: 'u***@x.com' style."""
    if not email or "@" not in email:
        return "Anonymous"
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        return f"{local}***@{domain}"
    return f"{local[0]}***@{domain}"


def _period_since(period: str) -> Optional[datetime]:
    now = datetime.now()
    if period == "weekly":
        return now - timedelta(days=7)
    if period == "monthly":
        return now - timedelta(days=30)
    return None


def _latest_predictions_subquery(db: Session):
    latest_created = (
        db.query(
            Prediction.game_id.label("game_id"),
            func.max(Prediction.created_at).label("max_created_at"),
        )
        .group_by(Prediction.game_id)
        .subquery("latest_pred_times")
    )
    return (
        db.query(Prediction)
        .join(
            latest_created,
            and_(
                Prediction.game_id == latest_created.c.game_id,
                Prediction.created_at == latest_created.c.max_created_at,
            ),
        )
        .subquery("latest_predictions")
    )


def fetch_leaderboard(
    db: Session,
    *,
    period: str,
    limit: int,
    current_user_id: Optional[UUID] = None,
) -> dict[str, Any]:
    """
    Rank users by accuracy on finished games they viewed.
    One counted pick per user per game; uses latest model prediction per game.
    """
    since = _period_since(period)
    latest_pred = _latest_predictions_subquery(db)

    home_prob = cast(latest_pred.c.home_win_probability, Float)
    away_prob = cast(latest_pred.c.away_win_probability, Float)
    predicted_home = home_prob > away_prob
    actual_home = func.coalesce(Game.home_score, 0) > func.coalesce(Game.away_score, 0)
    is_correct = case((predicted_home == actual_home, 1), else_=0)

    user_game_q = (
        db.query(
            UserPredictionView.user_id.label("user_id"),
            UserPredictionView.game_id.label("game_id"),
            func.max(is_correct).label("is_correct"),
        )
        .join(Game, UserPredictionView.game_id == Game.id)
        .join(latest_pred, latest_pred.c.game_id == Game.id)
        .filter(Game.status.in_(FINISHED_STATUSES))
    )
    if since is not None:
        user_game_q = user_game_q.filter(UserPredictionView.viewed_at >= since)
    user_game = user_game_q.group_by(
        UserPredictionView.user_id,
        UserPredictionView.game_id,
    ).subquery("user_game")

    stats_subq = (
        db.query(
            user_game.c.user_id.label("user_id"),
            func.sum(user_game.c.is_correct).label("correct"),
            func.count().label("total"),
        )
        .group_by(user_game.c.user_id)
        .subquery("user_stats")
    )

    eligible_users = db.query(func.count()).select_from(stats_subq).scalar() or 0
    if eligible_users == 0:
        return {
            "period": period,
            "entries": [],
            "count": 0,
            **_leaderboard_meta(0),
        }

    accuracy_pct = (
        cast(stats_subq.c.correct, Float) * 100.0 / cast(stats_subq.c.total, Float)
    )
    ranked = (
        db.query(
            stats_subq.c.user_id,
            stats_subq.c.correct,
            stats_subq.c.total,
        )
        .order_by(desc(accuracy_pct), desc(stats_subq.c.correct))
        .limit(limit)
        .all()
    )

    user_ids = [row.user_id for row in ranked]
    users = {u.id: u for u in db.query(User).filter(User.id.in_(user_ids)).all()}

    entries = []
    for rank, row in enumerate(ranked, start=1):
        u = users.get(row.user_id)
        display_name = _mask_email(u.email) if u else "Anonymous"
        total = int(row.total)
        correct = int(row.correct)
        accuracy_pct_val = round(100.0 * correct / total, 1) if total else 0
        entries.append(
            {
                "rank": rank,
                "user_id": str(row.user_id),
                "display_name": display_name,
                "correct": correct,
                "total": total,
                "accuracy_pct": accuracy_pct_val,
                "is_me": current_user_id is not None and current_user_id == row.user_id,
            }
        )

    return {
        "period": period,
        "entries": entries,
        "count": len(entries),
        **_leaderboard_meta(eligible_users),
    }
