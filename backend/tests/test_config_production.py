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
        )


def test_production_accepts_strong_jwt_and_redis():
    s = Settings(
        environment="production",
        jwt_secret="x" * 40,
        redis_url="redis://localhost:6379/0",
    )
    assert s.environment == "production"
