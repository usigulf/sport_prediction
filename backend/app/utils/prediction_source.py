"""
Classify how a stored prediction was produced (sklearn vs baseline heuristic vs warming).

Used by API payloads and production quality gates so clients can label picks honestly.
"""
from __future__ import annotations

from typing import Any

PREDICTION_SOURCE_SKLEARN = "sklearn"
PREDICTION_SOURCE_HEURISTIC = "heuristic"
PREDICTION_SOURCE_WARMING = "warming"
PREDICTION_SOURCE_SYNTHETIC = "synthetic"
PREDICTION_SOURCE_INPLAY = "inplay"

LOW_TRUST_SOURCES = frozenset(
    {
        PREDICTION_SOURCE_HEURISTIC,
        PREDICTION_SOURCE_WARMING,
        PREDICTION_SOURCE_SYNTHETIC,
    }
)


def classify_prediction_source(
    model_version: str | None,
    *,
    default_version: str = "v1.0.0",
) -> str:
    """
    Map stored model_version to a stable prediction_source label for clients.

    sklearn_* rows come from trained pickles; heuristic_* / config default versions
    are baseline engines; *_synthetic marks placeholder feature inputs.
    """
    mv = (model_version or "").strip().lower()
    if not mv:
        return PREDICTION_SOURCE_WARMING

    if "inplay" in mv or "in_play" in mv:
        return PREDICTION_SOURCE_INPLAY

    if "synthetic" in mv or mv.endswith("_demo"):
        return PREDICTION_SOURCE_SYNTHETIC

    if mv.startswith("sklearn") or "sklearn_" in mv:
        return PREDICTION_SOURCE_SKLEARN

    if "heuristic" in mv:
        return PREDICTION_SOURCE_HEURISTIC

    default = (default_version or "v1.0.0").strip().lower()
    if mv == default:
        return PREDICTION_SOURCE_WARMING

    return PREDICTION_SOURCE_HEURISTIC


def is_low_trust_prediction_source(source: str | None) -> bool:
    return (source or "").strip().lower() in LOW_TRUST_SOURCES


def prediction_source_gate_reason(source: str) -> str:
    if source == PREDICTION_SOURCE_WARMING:
        return (
            "Full ML model is still warming — this pick uses the baseline engine until "
            "enough finished games are logged."
        )
    if source == PREDICTION_SOURCE_SYNTHETIC:
        return (
            "This league uses placeholder inputs until full standings sync is available."
        )
    return (
        "This pick uses the baseline heuristic engine, not the trained sklearn model."
    )


def apply_prediction_source_production_gate(
    quality: dict[str, Any],
    model_version: str | None,
    *,
    environment: str,
    default_model_version: str,
    strict_suppression: bool | None = None,
) -> tuple[dict[str, Any], str]:
    """
    Attach prediction_source and gate low-trust baseline picks.

    When ``strict_suppression`` is True (default via settings / production),
    heuristic/warming/synthetic sources force ``quality_gate_applied`` so clients
    and payloads can suppress probability display (external audit #9).
    """
    source = classify_prediction_source(
        model_version,
        default_version=default_model_version,
    )
    enriched = dict(quality)
    env = (environment or "").strip().lower()
    if strict_suppression is None:
        strict_suppression = env == "production"
    if strict_suppression and is_low_trust_prediction_source(source):
        enriched["quality_gate_applied"] = True
        enriched["data_quality_label"] = "low"
        reasons = list(enriched.get("quality_reasons") or [])
        reason = prediction_source_gate_reason(source)
        if reason not in reasons:
            reasons.append(reason)
        enriched["quality_reasons"] = reasons
    return enriched, source
