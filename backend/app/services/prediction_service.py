"""
Prediction service - business logic for predictions
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from uuid import UUID
from app.models.prediction import Prediction
from app.models.user import User
from app.services.cache_service import CacheService
from app.services.free_tier_limits import FreeTierPredictionLimiter


class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.cache = CacheService()
        self._free_tier = FreeTierPredictionLimiter(self.cache)
    
    def free_tier_limiter(self) -> FreeTierPredictionLimiter:
        return self._free_tier

    def invalidate_prediction_cache(self, game_id: str) -> None:
        """Call after inserting a new prediction so readers see fresh probabilities."""
        self.cache.delete(f"prediction:{game_id}")

    def get_latest_prediction(self, game_id: str, use_cache: bool = True) -> Optional[Prediction]:
        """Get latest prediction for a game. use_cache=False for WebSocket / post-invalidation reads."""
        cache_key = f"prediction:{game_id}"

        if use_cache:
            cached = self.cache.get(cache_key)
            if cached:
                prediction = self.db.query(Prediction).filter(Prediction.id == cached["id"]).first()
                if prediction:
                    return prediction

        try:
            game_uuid = UUID(game_id)
        except ValueError:
            return None

        prediction = (
            self.db.query(Prediction)
            .filter(Prediction.game_id == game_uuid)
            .order_by(desc(Prediction.created_at))
            .first()
        )

        if prediction and use_cache:
            self.cache.set(
                cache_key,
                {
                    "id": str(prediction.id),
                    "game_id": str(prediction.game_id),
                    "model_version": prediction.model_version,
                },
                ttl=3600,
            )

        return prediction
    
    def has_exceeded_daily_limit(self, user_id: UUID) -> bool:
        """Check if free user has exceeded daily prediction limit."""
        return self._free_tier.has_exceeded_daily_limit(user_id)

    def increment_daily_prediction_count(self, user_id: UUID):
        """Deprecated: prefer grant_free_tier_prediction_view(user, game_id)."""
        count = self._free_tier.get_view_count(user_id)
        self.cache.set(self._free_tier._count_key(user_id), count + 1, ttl=86400)

    def grant_free_tier_prediction_view(self, user: Optional[User], game_id: UUID) -> bool:
        """Record and authorize a prediction view for free-tier users."""
        return self._free_tier.grant_prediction_view(user, game_id)

    def may_show_prediction_to_user(self, user: Optional[User], game_id: UUID) -> bool:
        """Whether prediction payload may be attached for this user/game."""
        return self._free_tier.may_show_prediction(user, game_id)
