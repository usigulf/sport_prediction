"""
User endpoints
"""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from app.database import get_db
from app.api.deps import get_current_user
from app.config import get_settings
from app.services.subscription_cancel_service import cancel_external_subscriptions_for_user
from app.services.gdpr_export_service import build_user_data_export
from app.services.user_brier_service import build_user_brier_summary, record_user_pick
from app.schemas.user import UserResponse
from app.models.game import Game
from app.models.user import User
from app.models.user_favorite import UserFavorite
from app.models.user_prediction_view import UserPredictionView
from app.models.user_pick import UserPick
from app.models.user_push_token import UserPushToken
from app.models.push_reminder_sent import PushReminderSent
from app.models.team import Team
from app.schemas.common import PaginationParams, datetime_to_iso
from app.constants.leagues import ALLOWED_LEAGUE_CODES, LEAGUE_LABEL_BY_ID
from app.utils.team_logo_urls import team_to_api_dict

router = APIRouter(prefix="/user", tags=["user"])


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current user information"""
    return current_user


@router.get("/favorites")
async def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's favorite teams and leagues (with team details expanded)."""
    favorites = db.query(UserFavorite).filter(UserFavorite.user_id == current_user.id).all()
    # Remove league favorites outside current product scope (legacy / invalid codes).
    removed_legacy_league = False
    for fav in favorites:
        if fav.entity_type == "league" and fav.entity_id.lower() not in ALLOWED_LEAGUE_CODES:
            db.delete(fav)
            removed_legacy_league = True
    if removed_legacy_league:
        db.commit()
        favorites = db.query(UserFavorite).filter(UserFavorite.user_id == current_user.id).all()

    team_ids = [f.entity_id for f in favorites if f.entity_type == "team"]
    league_codes = sorted(
        {f.entity_id.lower() for f in favorites if f.entity_type == "league" and f.entity_id.lower() in ALLOWED_LEAGUE_CODES}
    )

    teams = []
    if team_ids:
        try:
            team_uuids = [UUID(tid) for tid in team_ids]
        except ValueError:
            team_uuids = []
        if team_uuids:
            team_rows = db.query(Team).filter(Team.id.in_(team_uuids)).all()
            teams = [team_to_api_dict(t) for t in team_rows]
    leagues = [
        {"id": code, "name": LEAGUE_LABEL_BY_ID.get(code, code.replace("_", " ").title())}
        for code in league_codes
    ]

    return {"teams": teams, "leagues": leagues}


@router.post("/favorites/teams/{team_id}")
async def add_favorite_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add team to favorites."""
    try:
        team_uuid = UUID(team_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid team ID format")
    team = db.query(Team).filter(Team.id == team_uuid).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    existing = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.entity_type == "team",
        UserFavorite.entity_id == team_id,
    ).first()
    if existing:
        return {"message": "Team already in favorites"}
    fav = UserFavorite(user_id=current_user.id, entity_type="team", entity_id=team_id)
    db.add(fav)
    db.commit()
    return {"message": "Team added to favorites"}


@router.delete("/favorites/teams/{team_id}")
async def remove_favorite_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove team from favorites."""
    deleted = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.entity_type == "team",
        UserFavorite.entity_id == team_id,
    ).delete()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Favorite not found")
    return {"message": "Team removed from favorites"}


@router.post("/favorites/leagues/{league_code}")
async def add_favorite_league(
    league_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add league to favorites. League code is case-insensitive (e.g. nfl, NFL)."""
    code = league_code.strip().lower()
    if not code:
        raise HTTPException(status_code=400, detail="League code is required")
    if code not in ALLOWED_LEAGUE_CODES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown league. Allowed: {', '.join(sorted(ALLOWED_LEAGUE_CODES))}",
        )
    existing = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.entity_type == "league",
        UserFavorite.entity_id == code,
    ).first()
    if existing:
        return {"message": "League already in favorites"}
    fav = UserFavorite(user_id=current_user.id, entity_type="league", entity_id=code)
    db.add(fav)
    db.commit()
    return {"message": "League added to favorites"}


@router.delete("/favorites/leagues/{league_code}")
async def remove_favorite_league(
    league_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove league from favorites. League code is case-insensitive."""
    code = league_code.strip().lower()
    deleted = db.query(UserFavorite).filter(
        UserFavorite.user_id == current_user.id,
        UserFavorite.entity_type == "league",
        UserFavorite.entity_id == code,
    ).delete()
    db.commit()
    if not deleted:
        raise HTTPException(status_code=404, detail="Favorite league not found")
    return {"message": "League removed from favorites"}


def _team_to_response(team):
    return team_to_api_dict(team)


@router.get("/prediction-history")
async def get_prediction_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    pagination: PaginationParams = Depends()
):
    """Get user's prediction viewing history (paginated, most recent first)."""
    total = db.query(UserPredictionView).filter(
        UserPredictionView.user_id == current_user.id
    ).count()
    rows = (
        db.query(UserPredictionView)
        .filter(UserPredictionView.user_id == current_user.id)
        .options(
            joinedload(UserPredictionView.game).joinedload("home_team"),
            joinedload(UserPredictionView.game).joinedload("away_team"),
        )
        .order_by(desc(UserPredictionView.viewed_at))
        .offset(pagination.skip)
        .limit(pagination.limit)
        .all()
    )
    predictions = []
    for row in rows:
        game = row.game
        game_data = None
        if game:
            game_data = {
                "id": str(game.id),
                "league": game.league,
                "home_team": _team_to_response(game.home_team),
                "away_team": _team_to_response(game.away_team),
                "scheduled_time": datetime_to_iso(game.scheduled_time),
                "status": game.status,
                "home_score": game.home_score,
                "away_score": game.away_score,
            }
        predictions.append({
            "id": str(row.id),
            "game_id": str(row.game_id),
            "prediction_id": str(row.prediction_id) if row.prediction_id else None,
            "viewed_at": row.viewed_at.isoformat() if row.viewed_at else None,
            "game": game_data,
        })
    return {
        "predictions": predictions,
        "total": total,
        "skip": pagination.skip,
        "limit": pagination.limit,
    }


@router.post("/push-token")
async def register_push_token(
    body: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Register an Expo (or other) push token for this user. Body: {"token": "ExponentPushToken[xxx]"}."""
    token = body.get("token") if isinstance(body, dict) else None
    if not token or not isinstance(token, str) or len(token.strip()) == 0:
        raise HTTPException(status_code=400, detail="token is required")
    token = token.strip()
    existing = db.query(UserPushToken).filter(
        UserPushToken.user_id == current_user.id,
        UserPushToken.token == token,
    ).first()
    if existing:
        return {"message": "Token already registered"}
    row = UserPushToken(user_id=current_user.id, token=token, platform="expo")
    db.add(row)
    db.commit()
    return {"message": "Push token registered"}


@router.delete("/push-token")
async def remove_push_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    token: Optional[str] = Query(None, description="ExponentPushToken[xxx] to remove one; omit to remove all"),
):
    """Remove push token(s). Query ?token=ExponentPushToken[xxx] to remove one; no query to remove all for user."""
    if token and token.strip():
        deleted = db.query(UserPushToken).filter(
            UserPushToken.user_id == current_user.id,
            UserPushToken.token == token.strip(),
        ).delete()
    else:
        deleted = db.query(UserPushToken).filter(UserPushToken.user_id == current_user.id).delete()
    db.commit()
    return {"message": "Push token(s) removed", "deleted": deleted}


class ReferralApplyBody(BaseModel):
    referral_code: str = Field(..., min_length=8, max_length=64)


class UserPickBody(BaseModel):
    game_id: str
    outcome: str = Field(..., pattern="^(home|away|draw)$")
    probability: float = Field(..., ge=0.01, le=0.99)
    market_home_implied_prob: Optional[float] = Field(None, ge=0.0, le=1.0)
    market_away_implied_prob: Optional[float] = Field(None, ge=0.0, le=1.0)


@router.post("/me/picks")
async def submit_user_pick(
    body: UserPickBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Record or update the user's pick for a game (I92 — Brier tracking)."""
    try:
        game_uuid = UUID(body.game_id.strip())
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid game_id") from e
    game = db.query(Game).filter(Game.id == game_uuid).first()
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    try:
        pick = record_user_pick(
            db,
            user_id=current_user.id,
            game=game,
            outcome=body.outcome,
            probability=body.probability,
            market_home_implied=body.market_home_implied_prob,
            market_away_implied=body.market_away_implied_prob,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {
        "id": str(pick.id),
        "game_id": str(pick.game_id),
        "outcome": pick.outcome,
        "probability": float(pick.probability),
        "created_at": datetime_to_iso(pick.created_at),
    }


@router.get("/me/picks/brier")
async def get_user_brier_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Per-user Brier score vs model on finished games + CLV rollup (I92, I63)."""
    return build_user_brier_summary(db, current_user.id)


@router.get("/me/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """GDPR Article 20 — portable export of account data (JSON)."""
    return build_user_data_export(db, current_user)


@router.post("/me/privacy/ccpa-opt-out")
async def ccpa_opt_out(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """CCPA — record do-not-sell/opt-out preference (we do not sell PII; audit trail)."""
    now = datetime.now(timezone.utc)
    current_user.ccpa_opt_out_at = now
    db.commit()
    db.refresh(current_user)
    return {
        "message": "CCPA opt-out recorded. We do not sell personal information.",
        "ccpa_opt_out_at": datetime_to_iso(now),
    }


@router.get("/referral/code")
async def get_referral_code(current_user: User = Depends(get_current_user)):
    """Referral invite code (user id) for share links."""
    return {"referral_code": str(current_user.id)}


@router.post("/referral/apply")
async def apply_referral_code(
    body: ReferralApplyBody,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Attach referrer on first apply (Imp #42 partial — tracking; bonus via ASC/Stripe)."""
    if getattr(current_user, "referred_by_user_id", None):
        return {"message": "Referral already applied", "applied": False}
    code = body.referral_code.strip()
    if code == str(current_user.id):
        raise HTTPException(status_code=400, detail="Cannot refer yourself")
    try:
        referrer_id = UUID(code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid referral code") from e
    referrer = db.query(User).filter(User.id == referrer_id).first()
    if not referrer:
        raise HTTPException(status_code=404, detail="Referral code not found")
    current_user.referred_by_user_id = referrer_id
    db.commit()
    return {"message": "Referral recorded", "applied": True, "referrer_id": str(referrer_id)}


@router.delete("/me")
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Permanently delete the current user and all associated data (GDPR right to erasure).
    Cancels Stripe subscriptions and removes the RevenueCat subscriber when configured.
    Favorites, prediction history, push tokens, and reminder records are removed.
    The session is invalid after this.
    """
    user_id = current_user.id
    cancel_external_subscriptions_for_user(str(user_id), get_settings())
    db.query(UserPushToken).filter(UserPushToken.user_id == user_id).delete()
    db.query(PushReminderSent).filter(PushReminderSent.user_id == user_id).delete()
    db.query(UserPredictionView).filter(UserPredictionView.user_id == user_id).delete()
    db.query(UserPick).filter(UserPick.user_id == user_id).delete()
    db.query(UserFavorite).filter(UserFavorite.user_id == user_id).delete()
    db.query(User).filter(User.id == user_id).delete()
    db.commit()
    return {"message": "Account and all associated data have been permanently deleted."}
