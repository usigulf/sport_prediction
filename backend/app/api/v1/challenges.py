"""
Challenges: user creates a challenge with N games; we resolve when all games are finished.
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.models.challenge import Challenge
from app.models.game import Game
from app.models.prediction import Prediction

router = APIRouter(prefix="/challenges", tags=["challenges"])

MAX_GAMES_PER_CHALLENGE = 10


class CreateChallengeRequest(BaseModel):
    game_ids: List[str] = Field(..., min_length=1, max_length=MAX_GAMES_PER_CHALLENGE)


def _resolve_challenge(db: Session, c: Challenge) -> None:
    """If challenge is active and all games are finished, compute correct/total and mark completed."""
    if c.status != "active":
        return
    ids = c.get_game_ids_list()
    if not ids:
        return
    games = db.query(Game).filter(Game.id.in_(ids)).all()
    game_map = {str(g.id): g for g in games}
    if len(game_map) != len(ids):
        return
    for gid in ids:
        g = game_map.get(gid)
        if not g or g.status not in ("finished", "final"):
            return
    # All games finished: compute correct count from latest prediction per game
    correct = 0
    total = len(ids)
    for gid in ids:
        g = game_map[gid]
        pred = (
            db.query(Prediction)
            .filter(Prediction.game_id == g.id)
            .order_by(desc(Prediction.created_at))
            .first()
        )
        if not pred:
            total -= 1
            continue
        predicted_home_win = float(pred.home_win_probability) > float(pred.away_win_probability)
        actual_home_win = (g.home_score or 0) > (g.away_score or 0)
        if predicted_home_win == actual_home_win:
            correct += 1
    c.correct_count = correct
    c.total_count = total
    c.status = "completed"
    c.completed_at = datetime.now(timezone.utc)
    db.commit()


def _challenge_to_response(c: Challenge) -> dict:
    return {
        "id": str(c.id),
        "creator_id": str(c.creator_id),
        "game_ids": c.get_game_ids_list(),
        "status": c.status,
        "correct_count": c.correct_count,
        "total_count": c.total_count,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "completed_at": c.completed_at.isoformat() if c.completed_at else None,
    }


@router.get("")
async def list_challenges(
    status_filter: Optional[str] = Query(None, alias="status", description="active | completed | all"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List challenges created by the current user."""
    q = db.query(Challenge).filter(Challenge.creator_id == current_user.id)
    if status_filter and status_filter != "all":
        q = q.filter(Challenge.status == status_filter)
    challenges = q.order_by(desc(Challenge.created_at)).limit(limit).all()
    for c in challenges:
        _resolve_challenge(db, c)
    return {
        "challenges": [_challenge_to_response(c) for c in challenges],
        "count": len(challenges),
    }


@router.get("/{challenge_id}")
async def get_challenge(
    challenge_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get one challenge by id (must be creator)."""
    c = db.query(Challenge).filter(Challenge.id == challenge_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Challenge not found")
    if c.creator_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your challenge")
    _resolve_challenge(db, c)
    return _challenge_to_response(c)


@router.post("")
async def create_challenge(
    body: CreateChallengeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new challenge with the given game_ids. Games must exist and be scheduled."""
    if len(body.game_ids) > MAX_GAMES_PER_CHALLENGE:
        raise HTTPException(
            status_code=400,
            detail=f"At most {MAX_GAMES_PER_CHALLENGE} games per challenge",
        )
    seen = set()
    clean_ids = []
    for gid in body.game_ids:
        try:
            uid = UUID(gid)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid game id: {gid}")
        if gid in seen:
            continue
        seen.add(gid)
        clean_ids.append(uid)
    if not clean_ids:
        raise HTTPException(status_code=400, detail="At least one unique game_id required")
    games = db.query(Game).filter(Game.id.in_(clean_ids)).all()
    if len(games) != len(clean_ids):
        found = {g.id for g in games}
        missing = [str(i) for i in clean_ids if i not in found]
        raise HTTPException(status_code=404, detail=f"Games not found: {missing}")
    for g in games:
        if g.status not in ("scheduled", "live", "in_progress"):
            raise HTTPException(
                status_code=400,
                detail=f"Game {g.id} is not open for challenges (status={g.status})",
            )
    c = Challenge(creator_id=current_user.id)
    c.set_game_ids_list(clean_ids)
    c.status = "active"
    c.total_count = len(clean_ids)
    db.add(c)
    db.commit()
    db.refresh(c)
    return _challenge_to_response(c)
