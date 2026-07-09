"""Utility endpoints: parlay correlation checks (I66)."""
from __future__ import annotations

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user_optional
from app.database import get_db
from app.models.user import User
from app.services.parlay_correlation_service import analyze_parlay_correlation

router = APIRouter(prefix="/tools", tags=["tools"])


class ParlayCheckBody(BaseModel):
    game_ids: list[str] = Field(..., min_length=1, max_length=16)


@router.post("/parlay-correlation")
async def parlay_correlation_check(
    body: ParlayCheckBody,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    Informational correlation warnings for multi-leg slips (I66).
    Guests and signed-in users may call; no wagering implied.
    """
    try:
        for gid in body.game_ids:
            UUID(str(gid))
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid game ID in list") from e
    try:
        return analyze_parlay_correlation(db, body.game_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
