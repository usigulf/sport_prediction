"""
Load sklearn artifacts (simple_model.pkl + feature_columns.pkl) and run inference.
Returns None if artifacts are missing; callers should use a heuristic fallback.
Artifacts must live in a trusted read-only directory (mounted in Docker).
"""
from __future__ import annotations

import logging
import os
import pickle
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Only unpickle files with these exact names from the model directory.
_ALLOWED_ARTIFACTS = frozenset({"simple_model.pkl", "feature_columns.pkl"})


def _artifact_paths(model_dir: str) -> tuple[str, str]:
    return (
        os.path.join(model_dir, "simple_model.pkl"),
        os.path.join(model_dir, "feature_columns.pkl"),
    )


def _safe_load_pickle(path: str) -> Any:
    basename = os.path.basename(path)
    if basename not in _ALLOWED_ARTIFACTS:
        raise ValueError(f"Refusing to unpickle unexpected artifact: {basename}")
    real_dir = os.path.realpath(os.path.dirname(path))
    if not os.access(real_dir, os.R_OK):
        raise PermissionError(f"Model directory not readable: {real_dir}")
    with open(path, "rb") as f:
        return pickle.load(f)


def predict_from_artifacts(
    model_dir: str,
    features: dict[str, Any],
) -> Optional[dict[str, Any]]:
    """
    If model_dir contains trained pickles, return
    home_win_probability, away_win_probability, confidence_level, model_version.
    """
    if not model_dir or not os.path.isdir(model_dir):
        return None
    model_path, feature_path = _artifact_paths(model_dir)
    if not os.path.isfile(model_path) or not os.path.isfile(feature_path):
        return None
    try:
        import pandas as pd
    except ImportError:
        return None
    try:
        model = _safe_load_pickle(model_path)
        feature_columns: list = _safe_load_pickle(feature_path)
    except Exception as exc:
        logger.warning("Failed to load ML artifacts from %s: %s", model_dir, exc)
        return None
    if not hasattr(model, "predict_proba"):
        return None

    row: dict[str, Any] = dict(features)
    for col in feature_columns:
        if col not in row:
            row[col] = 0.5
    try:
        df = pd.DataFrame([row])[list(feature_columns)]
        proba = model.predict_proba(df)[0]
        home_win = float(proba[1]) if len(proba) > 1 else float(proba[0])
    except Exception:
        return None

    home_win = max(0.02, min(0.98, home_win))
    away_win = 1.0 - home_win
    if home_win >= 0.7 or home_win <= 0.3:
        confidence = "high"
    elif home_win >= 0.55 or home_win <= 0.45:
        confidence = "medium"
    else:
        confidence = "low"

    return {
        "home_win_probability": round(home_win, 4),
        "away_win_probability": round(away_win, 4),
        "confidence_level": confidence,
        "model_version": "sklearn_simple",
    }


def heuristic_predict(features: dict[str, Any], default_version: str) -> dict[str, Any]:
    """When no pickle model is available, use a linear blend of form features."""
    h_wr = float(features["home_team_win_rate"])
    a_wr = float(features["away_team_win_rate"])
    h_form = float(features["home_team_recent_form"])
    a_form = float(features["away_team_recent_form"])
    adv = float(features["home_advantage"])
    raw = (
        h_wr * 0.32
        + (1.0 - a_wr) * 0.22
        + h_form * 0.22
        + (1.0 - a_form) * 0.14
        + adv * 1.8
    )
    home_win = max(0.06, min(0.94, raw))
    away_win = 1.0 - home_win
    if home_win >= 0.68 or home_win <= 0.32:
        confidence = "high"
    elif home_win >= 0.56 or home_win <= 0.44:
        confidence = "medium"
    else:
        confidence = "low"
    version = default_version
    if default_version and "synthetic" not in default_version:
        version = f"{default_version}_synthetic"
    return {
        "home_win_probability": round(home_win, 4),
        "away_win_probability": round(away_win, 4),
        "confidence_level": confidence,
        "model_version": version,
    }
