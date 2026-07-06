"""prediction_source classification and production gating."""
from app.utils.prediction_source import (
    PREDICTION_SOURCE_HEURISTIC,
    PREDICTION_SOURCE_INPLAY,
    PREDICTION_SOURCE_SKLEARN,
    PREDICTION_SOURCE_SYNTHETIC,
    PREDICTION_SOURCE_WARMING,
    apply_prediction_source_production_gate,
    classify_prediction_source,
    is_low_trust_prediction_source,
)


def test_classify_sklearn():
    assert classify_prediction_source("sklearn_football") == PREDICTION_SOURCE_SKLEARN
    assert classify_prediction_source("sklearn_simple_inplay_v0") == PREDICTION_SOURCE_INPLAY


def test_classify_heuristic_and_warming():
    assert classify_prediction_source("heuristic_v2") == PREDICTION_SOURCE_HEURISTIC
    assert classify_prediction_source("v1.0.0", default_version="v1.0.0") == PREDICTION_SOURCE_WARMING
    assert classify_prediction_source("v1.0.0_synthetic") == PREDICTION_SOURCE_SYNTHETIC


def test_classify_inplay_and_synthetic():
    assert classify_prediction_source("heuristic_inplay_v0") == PREDICTION_SOURCE_INPLAY
    assert classify_prediction_source("v2_demo") == PREDICTION_SOURCE_SYNTHETIC


def test_production_gate_forces_low_trust():
    quality = {
        "data_quality_score": 0.9,
        "data_quality_label": "high",
        "quality_gate_applied": False,
        "quality_reasons": [],
    }
    enriched, source = apply_prediction_source_production_gate(
        quality,
        "heuristic_v2",
        environment="production",
        default_model_version="v1.0.0",
    )
    assert source == PREDICTION_SOURCE_HEURISTIC
    assert enriched["quality_gate_applied"] is True
    assert enriched["data_quality_label"] == "low"
    assert enriched["quality_reasons"]


def test_production_gate_skips_sklearn():
    quality = {
        "data_quality_score": 0.9,
        "data_quality_label": "high",
        "quality_gate_applied": False,
        "quality_reasons": [],
    }
    enriched, source = apply_prediction_source_production_gate(
        quality,
        "sklearn_football",
        environment="production",
        default_model_version="v1.0.0",
    )
    assert source == PREDICTION_SOURCE_SKLEARN
    assert enriched["quality_gate_applied"] is False


def test_development_does_not_gate_heuristic():
    quality = {
        "data_quality_score": 0.9,
        "data_quality_label": "high",
        "quality_gate_applied": False,
        "quality_reasons": [],
    }
    enriched, _ = apply_prediction_source_production_gate(
        quality,
        "heuristic_v2",
        environment="development",
        default_model_version="v1.0.0",
    )
    assert enriched["quality_gate_applied"] is False


def test_is_low_trust_prediction_source():
    assert is_low_trust_prediction_source(PREDICTION_SOURCE_WARMING)
    assert is_low_trust_prediction_source(PREDICTION_SOURCE_SKLEARN) is False
    assert is_low_trust_prediction_source(PREDICTION_SOURCE_INPLAY) is False
