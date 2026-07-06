"""
Leaderboards: user ranking by prediction-view accuracy (games they viewed that finished).
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import require_pro_subscription
from app.models.user import User
from app.services.leaderboard_service import fetch_leaderboard

router = APIRouter(prefix="/leaderboards", tags=["leaderboards"])


@router.get("")
async def get_leaderboards(
    period: str = Query("monthly", description="weekly | monthly | all"),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_pro_subscription),
):
    """
    Leaderboard: users ranked by accuracy of finished games they viewed (prediction vs outcome).
    period: weekly (last 7 days), monthly (last 30 days), or all (no time filter).
    """
    return fetch_leaderboard(
        db,
        period=period,
        limit=limit,
        current_user_id=current_user.id,
    )
