"""
Prediction service - business logic for predictions
"""
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import Optional
from datetime import datetime
from uuid import UUID
from app.models.prediction import Prediction
from app.models.game import Game
from app.services.cache_service import CacheService


class PredictionService:
    def __init__(self, db: Session):
        self.db = db
        self.cache = CacheService()
    
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
        """Check if free user has exceeded daily prediction limit"""
        cache_key = f"daily_predictions:{user_id}:{datetime.now().date()}"
        raw = self.cache.get(cache_key)
        count = int(raw) if raw is not None else 0
        return count >= 10  # Free tier limit
    
    def increment_daily_prediction_count(self, user_id: UUID):
        """Increment daily prediction count for free user"""
        cache_key = f"daily_predictions:{user_id}:{datetime.now().date()}"
        raw = self.cache.get(cache_key)
        count = int(raw) if raw is not None else 0
        self.cache.set(cache_key, count + 1, ttl=86400)  # 24 hours
