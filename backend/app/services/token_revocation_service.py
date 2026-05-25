"""
JWT revocation by jti — Redis when available, in-memory fallback for dev/tests.
"""
from __future__ import annotations

import threading
import time
from typing import Optional

from app.services.cache_service import CacheService

_cache = CacheService()
_memory_revoked: dict[str, float] = {}
_memory_lock = threading.Lock()
_REDIS_PREFIX = "jwt:revoked:"


def _prune_memory_unlocked(now: float | None = None) -> None:
    """Caller must hold _memory_lock."""
    ts = now if now is not None else time.time()
    expired = [k for k, exp in _memory_revoked.items() if exp <= ts]
    for k in expired:
        del _memory_revoked[k]


def revoke_token(jti: str, expires_in_seconds: int) -> None:
    """Block a token until its natural expiry."""
    if not jti or expires_in_seconds <= 0:
        return
    ttl = max(1, int(expires_in_seconds))
    client = _cache.redis_client
    if client:
        try:
            client.setex(f"{_REDIS_PREFIX}{jti}", ttl, "1")
            return
        except Exception:
            pass
    with _memory_lock:
        _memory_revoked[jti] = time.time() + ttl
        _prune_memory_unlocked()


def clear_memory_revocations() -> None:
    with _memory_lock:
        _memory_revoked.clear()


def is_token_revoked(jti: Optional[str]) -> bool:
    if not jti:
        return False
    client = _cache.redis_client
    if client:
        try:
            if client.get(f"{_REDIS_PREFIX}{jti}"):
                return True
        except Exception:
            pass
    with _memory_lock:
        now = time.time()
        _prune_memory_unlocked(now)
        exp = _memory_revoked.get(jti)
        if exp is None:
            return False
        if exp <= now:
            del _memory_revoked[jti]
            return False
        return True
