"""
Rate limiting: Redis when available, in-memory fallback.
Fixed window per key (e.g. per IP or per user).
"""
import time
import threading
from typing import Optional

from app.config import get_settings
from app.services.cache_service import CacheService

_settings = get_settings()
_cache = CacheService()

# In-memory fallback: key -> list of request timestamps (pruned by window)
_memory_store: dict = {}
_memory_lock = threading.Lock()


def _memory_check(key: str, window_seconds: int, max_requests: int) -> bool:
    """Returns True if over limit (should reject)."""
    now = time.time()
    cutoff = now - window_seconds
    with _memory_lock:
        if key not in _memory_store:
            _memory_store[key] = []
        times = _memory_store[key]
        times[:] = [t for t in times if t > cutoff]
        if len(times) >= max_requests:
            return True
        times.append(now)
        return False


def _redis_check(key: str, window_seconds: int, max_requests: int) -> bool:
    """Returns True if over limit. Uses INCR + EXPIRE (fixed window)."""
    client = _cache.redis_client
    if not client:
        return _memory_check(key, window_seconds, max_requests)
    full_key = f"ratelimit:{key}"
    try:
        # Redis INCR is atomic; EXPIRE on first request in window
        count = client.incr(full_key)
        if count == 1:
            client.expire(full_key, window_seconds)
        return count > max_requests
    except Exception:
        return _memory_check(key, window_seconds, max_requests)


def is_over_limit(
    identifier: str,
    prefix: str,
    max_requests: int,
    window_seconds: int = 60,
) -> bool:
    """
    Check if the identifier (e.g. IP or user_id) is over the rate limit.
    prefix: e.g. "auth" or "predictions".
    Returns True if the request should be rejected (429).
    """
    key = f"{prefix}:{identifier}"
    return _redis_check(key, window_seconds, max_requests)
