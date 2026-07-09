"""Production settings validation."""
import pytest
from pydantic import ValidationError

from app.config import Settings


def test_production_rejects_weak_jwt():
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(
            environment="production",
            jwt_secret="dev-secret-key-change-in-production-minimum-32-characters-long",
            redis_url="redis://localhost:6379/0",
            redis_password="x" * 20,
        )


def test_production_rejects_missing_redis_password():
    with pytest.raises(ValidationError, match="REDIS_PASSWORD"):
        Settings(
            environment="production",
            jwt_secret="x" * 40,
            redis_url="redis://localhost:6379/0",
            redis_password=None,
        )


def test_production_accepts_strong_jwt_and_redis():
    s = Settings(
        environment="production",
        jwt_secret="x" * 40,
        redis_url="redis://localhost:6379/0",
        redis_password="x" * 20,
    )
    assert s.environment == "production"


def test_production_disables_openapi_by_default(monkeypatch):
    monkeypatch.delenv("OPENAPI_DOCS_ENABLED", raising=False)
    s = Settings(
        environment="production",
        jwt_secret="x" * 40,
        redis_url="redis://localhost:6379/0",
        redis_password="x" * 20,
    )
    assert s.openapi_docs_enabled is False
