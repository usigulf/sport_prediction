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

from app.services.model_training import (
    FEATURE_COLUMNS,
    MODEL_KIND_SOCCER_1X2,
    SOCCER_1X2_LABEL_AWAY,
    SOCCER_1X2_LABEL_DRAW,
    SOCCER_1X2_LABEL_HOME,
    load_metrics_json,
)

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


def decisive_home_edge_from_1x2(home_p: float, away_p: float) -> float:
    """P(home wins | match is not a draw) for expected-score translation."""
    rem = home_p + away_p
    if rem <= 1e-9:
        return 0.5
    return max(0.02, min(0.98, home_p / rem))


def _normalize_1x2_probs(home_p: float, draw_p: float, away_p: float) -> tuple[float, float, float]:
    home_p = max(0.01, float(home_p))
    draw_p = max(0.01, float(draw_p))
    away_p = max(0.01, float(away_p))
    total = home_p + draw_p + away_p
    if total <= 0:
        return 0.33, 0.34, 0.33
    return home_p / total, draw_p / total, away_p / total


def _proba_index(classes: list, label: int) -> int:
    class_to_idx = {int(c): i for i, c in enumerate(classes)}
    if label in class_to_idx:
        return class_to_idx[label]
    return 0


def _proba_index(classes: list, label: int) -> int:
    class_to_idx = {int(c): i for i, c in enumerate(classes)}
    if label in class_to_idx:
        return class_to_idx[label]
    return 0


def predict_with_estimator(
    estimator,
    features: dict[str, Any],
    *,
    model_kind: str | None = None,
    feature_columns: list[str] | None = None,
    model_version: str = "sklearn_walk_forward",
) -> Optional[dict[str, Any]]:
    """Run predict_proba on an in-memory sklearn estimator (walk-forward backtest)."""
    if not hasattr(estimator, "predict_proba"):
        return None
    try:
        import pandas as pd
    except ImportError:
        return None

    cols = feature_columns or FEATURE_COLUMNS
    row: dict[str, Any] = dict(features)
    for col in cols:
        if col not in row:
            row[col] = 0.5
    try:
        df = pd.DataFrame([row])[list(cols)]
        proba = estimator.predict_proba(df)[0]
        classes = [int(c) for c in estimator.classes_]
    except Exception:
        return None

    if model_kind == MODEL_KIND_SOCCER_1X2 or len(classes) >= 3:
        away_p = float(proba[_proba_index(classes, SOCCER_1X2_LABEL_AWAY)])
        draw_p = float(proba[_proba_index(classes, SOCCER_1X2_LABEL_DRAW)])
        home_p = float(proba[_proba_index(classes, SOCCER_1X2_LABEL_HOME)])
        home_p, draw_p, away_p = _normalize_1x2_probs(home_p, draw_p, away_p)
        return {
            "home_win_probability": round(home_p, 4),
            "away_win_probability": round(away_p, 4),
            "confidence_level": confidence_from_three_way(home_p, draw_p, away_p),
            "model_version": model_version,
            "native_1x2": True,
            "_proba": [float(p) for p in proba],
            "_classes": classes,
        }

    home_win = float(proba[1]) if len(proba) > 1 else float(proba[0])
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
        "model_version": model_version,
        "_proba": [float(p) for p in proba],
        "_classes": classes,
    }


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
        model = _safe_load_pickle(model_path)
        feature_columns: list = _safe_load_pickle(feature_path)
    except Exception as exc:
        logger.warning("Failed to load ML artifacts from %s: %s", model_dir, exc)
        return None
    if not hasattr(model, "predict_proba"):
        return None

    model_version = "sklearn_simple"
    metrics = load_metrics_json(model_dir)
    model_kind = metrics.get("model_kind") if metrics else None
    if metrics and metrics.get("model_version"):
        model_version = str(metrics["model_version"])

    out = predict_with_estimator(
        model,
        features,
        model_kind=model_kind,
        feature_columns=feature_columns,
        model_version=model_version,
    )
    if out is None:
        return None
    return {k: v for k, v in out.items() if not str(k).startswith("_")}


def soccer_three_way_from_home_edge(home_two_way: float) -> tuple[float, float, float]:
    """
    Convert a two-way (home-vs-away) win probability into a calibrated soccer
    1X2 distribution returned as (home, draw, away) that sums to 1.0.

    The draw arm peaks for evenly matched sides (~0.38, enough to be the modal
    outcome of a coin-flip fixture) and shrinks toward ~0.11 for lopsided
    matchups, bracketing the ~0.25 long-run draw rate seen in major leagues.
    Home/away mass is split proportionally from the remaining probability, so the
    stored pair sums to (1 − draw) and the implied draw used throughout the app
    equals this draw value. Because the peak exceeds 1/3, the most even matchups
    are correctly predicted as draws instead of always defaulting to a side.
    """
    p = max(0.02, min(0.98, home_two_way))
    closeness = 1.0 - 2.0 * abs(p - 0.5)  # 1.0 when even, 0.0 when lopsided
    draw_p = 0.11 + 0.27 * closeness
    draw_p = max(0.10, min(0.38, draw_p))
    rem = 1.0 - draw_p
    home_p = p * rem
    away_p = (1.0 - p) * rem
    return round(home_p, 4), round(draw_p, 4), round(away_p, 4)


def confidence_from_three_way(home_p: float, draw_p: float, away_p: float) -> str:
    """Confidence for a 1X2 distribution, based on the leading outcome's mass."""
    top = max(home_p, draw_p, away_p)
    if top >= 0.55:
        return "high"
    if top >= 0.42:
        return "medium"
    return "low"


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
