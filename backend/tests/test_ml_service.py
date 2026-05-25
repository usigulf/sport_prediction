"""
Legacy module name; ML HTTP client tests lived here before inference moved to artifacts/prediction_inference_service.
"""


def test_cache_service_roundtrip():
    """In-memory / Redis cache set-get (used by prediction paths)."""
    from app.services.cache_service import CacheService

    cache = CacheService()
    test_key = "test:prediction:123"
    test_value = {"home_win_probability": 0.65}

    cache.set(test_key, test_value, ttl=3600)
    cached = cache.get(test_key)

    assert cached == test_value
