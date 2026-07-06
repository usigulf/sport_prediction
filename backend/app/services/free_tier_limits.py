"""
Free-tier daily prediction view limits.

Each unique game prediction shown to a free user counts once per UTC calendar day.
Re-viewing the same game the same day does not consume additional quota.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional, Set
from uuid import UUID

from app.models.user import User
from app.utils.subscription_tiers import is_free_tier_user
from app.services.cache_service import CacheService

FREE_TIER_DAILY_PREDICTION_LIMIT = 10


class FreeTierPredictionLimiter:
    """Redis/in-memory backed daily prediction view accounting for free users."""

    def __init__(self, cache: Optional[CacheService] = None):
        self.cache = cache or CacheService()

    def _count_key(self, user_id: UUID) -> str:
        day = datetime.now(timezone.utc).date().isoformat()
        return f"daily_predictions:{user_id}:{day}"

    def _games_key(self, user_id: UUID) -> str:
        day = datetime.now(timezone.utc).date().isoformat()
        return f"daily_prediction_games:{user_id}:{day}"

    def get_view_count(self, user_id: UUID) -> int:
        raw = self.cache.get(self._count_key(user_id))
        if raw is None:
            return 0
        try:
            return int(raw)
        except (TypeError, ValueError):
            return 0

    def get_viewed_game_ids(self, user_id: UUID) -> Set[str]:
        raw = self.cache.get(self._games_key(user_id))
        if not raw:
            return set()
        if isinstance(raw, list):
            return {str(g) for g in raw}
        if isinstance(raw, str):
            return {g for g in raw.split(",") if g}
        return set()

    def has_viewed_game(self, user_id: UUID, game_id: UUID) -> bool:
        return str(game_id) in self.get_viewed_game_ids(user_id)

    def views_remaining(self, user_id: UUID) -> int:
        return max(0, FREE_TIER_DAILY_PREDICTION_LIMIT - self.get_view_count(user_id))

    def has_exceeded_daily_limit(self, user_id: UUID) -> bool:
        return self.views_remaining(user_id) <= 0

    def can_view_prediction(self, user_id: UUID, game_id: UUID) -> bool:
        """True if free user may see this game's prediction (quota or already viewed)."""
        if self.has_viewed_game(user_id, game_id):
            return True
        return not self.has_exceeded_daily_limit(user_id)

    def record_prediction_view(self, user_id: UUID, game_id: UUID) -> bool:
        """
        Record that a free user was shown a prediction for game_id.
        Returns True if the view is allowed; False if quota exhausted.
        Idempotent for the same game on the same day.
        """
        gid = str(game_id)
        viewed = self.get_viewed_game_ids(user_id)
        if gid in viewed:
            return True
        if self.has_exceeded_daily_limit(user_id):
            return False
        viewed.add(gid)
        self.cache.set(self._games_key(user_id), sorted(viewed), ttl=86400)
        self.cache.set(self._count_key(user_id), self.get_view_count(user_id) + 1, ttl=86400)
        return True

    def grant_prediction_view(self, user: Optional[User], game_id: UUID) -> bool:
        """
        Premium (and other paid tiers handled by callers) always granted.
        Free users consume quota via record_prediction_view.
        """
        if not is_free_tier_user(user):
            return True
        return self.record_prediction_view(user.id, game_id)

    def may_show_prediction(self, user: Optional[User], game_id: UUID) -> bool:
        """Check without consuming — use grant_prediction_view when attaching payload."""
        if not is_free_tier_user(user):
            return True
        return self.can_view_prediction(user.id, game_id)
