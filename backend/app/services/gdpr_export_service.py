"""GDPR Article 20 — portable export of user-held data."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user import User
from app.models.user_favorite import UserFavorite
from app.models.user_prediction_view import UserPredictionView
from app.models.user_push_token import UserPushToken
from app.schemas.common import datetime_to_iso


def build_user_data_export(db: Session, user: User) -> dict[str, Any]:
    """Aggregate portable user data (no password hashes)."""
    uid: UUID = user.id
    favorites = db.query(UserFavorite).filter(UserFavorite.user_id == uid).all()
    views = (
        db.query(UserPredictionView)
        .filter(UserPredictionView.user_id == uid)
        .order_by(UserPredictionView.viewed_at.desc())
        .limit(5000)
        .all()
    )
    push_tokens = db.query(UserPushToken).filter(UserPushToken.user_id == uid).all()

    return {
        "exported_at": datetime_to_iso(datetime.now(timezone.utc)),
        "format_version": "1.0",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "subscription_tier": user.subscription_tier,
            "created_at": datetime_to_iso(user.created_at),
            "updated_at": datetime_to_iso(user.updated_at),
            "ccpa_opt_out_at": datetime_to_iso(getattr(user, "ccpa_opt_out_at", None)),
            "subscription_trial_end_at": datetime_to_iso(getattr(user, "subscription_trial_end_at", None)),
            "referred_by_user_id": str(user.referred_by_user_id)
            if getattr(user, "referred_by_user_id", None)
            else None,
        },
        "favorites": [
            {"entity_type": f.entity_type, "entity_id": f.entity_id}
            for f in favorites
        ],
        "prediction_views": [
            {
                "game_id": str(v.game_id),
                "viewed_at": datetime_to_iso(v.viewed_at),
            }
            for v in views
        ],
        "push_tokens_registered": len(push_tokens),
    }
