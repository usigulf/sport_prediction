"""
Cache service — Redis when available; in-process fallback when Redis is down (dev/CI).

Fallback is shared across all CacheService() instances in the same process so tests and
PredictionService see the same daily-limit counters without Redis.
"""
from __future__ import annotations

import json
import logging
import threading
import time
from typing import Any, Optional

import redis

from app.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

# In-process fallback (same process = shared across CacheService instances)
_fallback_lock = threading.Lock()
_fallback_store: dict[str, tuple[str, Optional[float]]] = {}  # key -> (json_str, expire_at or None)


def clear_fallback_memory_store() -> None:
    """Clear in-memory cache (e.g. pytest teardown to isolate tests)."""
    with _fallback_lock:
        _fallback_store.clear()


class CacheService:
    def __init__(self):
        self.redis_client = None
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                password=settings.redis_password,
                decode_responses=True,
            )
            self.redis_client.ping()
        except Exception as e:
            logger.warning("Redis connection failed: %s. Using in-memory cache fallback.", e)
            self.redis_client = None

    def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            try:
                value = self.redis_client.get(key)
                if value:
                    return json.loads(value)
                return None
            except Exception as e:
                logger.error("Cache get error: %s", e)
                return None

        now = time.time()
        with _fallback_lock:
            if key not in _fallback_store:
                return None
            raw, exp = _fallback_store[key]
            if exp is not None and now >= exp:
                del _fallback_store[key]
                return None
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                del _fallback_store[key]
                return None

    def set(self, key: str, value: Any, ttl: int = 3600):
        if self.redis_client:
            try:
                self.redis_client.setex(
                    key,
                    ttl,
                    json.dumps(value, default=str),
                )
            except Exception as e:
                logger.error("Cache set error: %s", e)
            return

        raw = json.dumps(value, default=str)
        exp = time.time() + float(ttl) if ttl else None
        with _fallback_lock:
            _fallback_store[key] = (raw, exp)

    def delete(self, key: str):
        if self.redis_client:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                logger.error("Cache delete error: %s", e)
            return

        with _fallback_lock:
            _fallback_store.pop(key, None)
