"""Rate limit behavior in production vs development."""
from unittest.mock import patch

from app.services import rate_limit_service as rls


def test_production_without_redis_fails_closed():
    with patch.object(rls._cache, "redis_client", None):
        with patch.object(rls._settings, "environment", "production"):
            assert rls.is_over_limit("1.2.3.4", "auth", max_requests=5) is True


def test_development_without_redis_uses_memory():
    with patch.object(rls._cache, "redis_client", None):
        with patch.object(rls._settings, "environment", "development"):
            assert rls.is_over_limit("unique-ip-a", "auth", max_requests=100) is False
