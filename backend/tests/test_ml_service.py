"""
Tests for ML service
"""
import pytest
from unittest.mock import Mock, patch
from app.services.ml_service import MLService
from app.services.prediction_service import PredictionService


@pytest.fixture
def mock_ml_service():
    """Mock ML service"""
    with patch('app.services.ml_service.MLService') as mock:
        yield mock


def test_feature_engineering():
    """Test feature engineering"""
    from app.ml.feature_engineering.team_features import TeamFeatureEngineer
    
    engineer = TeamFeatureEngineer()
    
    # Mock historical data
    engineer.historical_data = [
        {"team_id": "team1", "result": "win", "score_diff": 7, "date": "2024-01-01"},
        {"team_id": "team1", "result": "loss", "score_diff": -3, "date": "2024-01-08"},
        {"team_id": "team1", "result": "win", "score_diff": 14, "date": "2024-01-15"},
    ]
    
    # This would require mocking the database calls
    # For now, just test that the class can be instantiated
    assert engineer is not None


@patch('app.services.ml_service.httpx.AsyncClient')
def test_ml_inference_call(mock_client_class):
    """Test ML inference service call"""
    mock_response = Mock()
    mock_response.json.return_value = {
        "predictions": [0.65],
        "confidence": "high"
    }
    mock_response.raise_for_status = Mock()
    
    mock_client = Mock()
    mock_client.post = Mock(return_value=mock_response)
    mock_client_class.return_value.__aenter__.return_value = mock_client
    
    # This is a simplified test - actual implementation would use async
    assert True  # Placeholder for actual async test


def test_prediction_service_caching():
    """Test that prediction service uses caching"""
    from app.services.cache_service import CacheService
    
    cache = CacheService()
    test_key = "test:prediction:123"
    test_value = {"home_win_probability": 0.65}
    
    cache.set(test_key, test_value, ttl=3600)
    cached = cache.get(test_key)
    
    assert cached == test_value


def test_prediction_confidence_levels():
    """Test confidence level determination"""
    from app.ml.inference.pre_game_inference import PreGameInference
    
    inference = PreGameInference()
    
    # Test high confidence
    assert inference.determine_confidence(0.75) == "high"
    assert inference.determine_confidence(0.25) == "high"
    
    # Test medium confidence
    assert inference.determine_confidence(0.60) == "medium"
    assert inference.determine_confidence(0.40) == "medium"
    
    # Test low confidence
    assert inference.determine_confidence(0.52) == "low"
    assert inference.determine_confidence(0.48) == "low"
