"""
Explanation service: when a trained model is available, returns logistic-regression
feature weights (calibrated coefficients) for the "Why this prediction?" explanation.
Falls back to None so the API can use matchup-specific or stub factors.
"""
from __future__ import annotations

import os
from typing import Any, List, Optional, Tuple

import numpy as np

from app.services.model_training import artifacts_publish_ready, resolve_model_dir_for_league

# Human-readable descriptions for known feature names (from FEATURE_COLUMNS in model_training)
FEATURE_DESCRIPTIONS = {
    "home_team_win_rate": "Home team win rate (season/form)",
    "away_team_win_rate": "Away team win rate (season/form)",
    "home_team_avg_score": "Home team average score",
    "away_team_avg_score": "Away team average score",
    "home_team_recent_form": "Home team recent form",
    "away_team_recent_form": "Away team recent form",
    "home_advantage": "Home court/field advantage",
    "rest_days_home": "Home team rest days",
    "rest_days_away": "Away team rest days",
}


def _load_model_and_features(model_dir: str) -> Optional[Tuple[object, List[str]]]:
    """Load simple_model.pkl and feature_columns.pkl from model_dir."""
    try:
        import pickle
    except ImportError:
        return None
    model_path = os.path.join(model_dir, "simple_model.pkl")
    feature_path = os.path.join(model_dir, "feature_columns.pkl")
    if not os.path.isfile(model_path) or not os.path.isfile(feature_path):
        return None
    try:
        with open(model_path, "rb") as f:
            model = pickle.load(f)
        with open(feature_path, "rb") as f:
            feature_columns = pickle.load(f)
        return model, list(feature_columns)
    except Exception:
        return None


def _coef_vector_from_fitted(estimator: Any) -> Optional[np.ndarray]:
    """Absolute logistic coefficients per feature (handles Pipeline + multiclass)."""
    from sklearn.pipeline import Pipeline

    clf = estimator
    if isinstance(estimator, Pipeline):
        clf = estimator.named_steps.get("clf")
    if clf is None or not hasattr(clf, "coef_"):
        return None
    coef = np.asarray(clf.coef_, dtype=float)
    if coef.ndim == 1:
        return np.abs(coef)
    return np.mean(np.abs(coef), axis=0)


def extract_calibrated_feature_weights(model: Any) -> Optional[np.ndarray]:
    """
    Mean |coef| per feature from a calibrated sklearn logistic model.

    CalibratedClassifierCV stores one fitted pipeline per CV fold; we average
    coefficient magnitudes across folds for a stable global explanation.
    """
    from sklearn.calibration import CalibratedClassifierCV

    if isinstance(model, CalibratedClassifierCV):
        parts: list[np.ndarray] = []
        for cc in getattr(model, "calibrated_classifiers_", []):
            inner = getattr(cc, "estimator", None)
            if inner is None:
                continue
            vec = _coef_vector_from_fitted(inner)
            if vec is not None:
                parts.append(vec)
        if not parts:
            return None
        return np.mean(parts, axis=0)

    return _coef_vector_from_fitted(model)


def resolve_explanation_model_dir(base_dir: str | None, league: str | None) -> str | None:
    """Pick per-league-group artifact dir (football/basketball/soccer) when published."""
    if not base_dir or not str(base_dir).strip():
        return None
    base = str(base_dir).strip()
    if not league:
        return base if artifacts_publish_ready(base) else None
    resolved = resolve_model_dir_for_league(base, league)
    return resolved


def get_model_feature_importance(
    model_dir: Optional[str],
    *,
    league: str | None = None,
    base_model_dir: str | None = None,
) -> Optional[List[dict]]:
    """
    Return sorted feature weights from the trained logistic model for this league group.

    When ``base_model_dir`` and ``league`` are set, resolves ``{base}/football`` etc.
    Weights are mean absolute calibrated logistic coefficients — not SHAP values.
    """
    resolved = model_dir
    if base_model_dir and league:
        resolved = resolve_explanation_model_dir(base_model_dir, league)
    elif league and model_dir:
        resolved = resolve_explanation_model_dir(model_dir, league) or model_dir

    if not artifacts_publish_ready(resolved):
        return None
    if not resolved or not os.path.isdir(resolved):
        return None
    loaded = _load_model_and_features(resolved)
    if not loaded:
        return None
    model, feature_columns = loaded
    weights = extract_calibrated_feature_weights(model)
    if weights is None or len(weights) != len(feature_columns):
        return None
    pairs = list(zip(feature_columns, weights.tolist()))
    pairs.sort(key=lambda x: abs(x[1]), reverse=True)
    return [
        {
            "feature": name.replace("_", " ").title(),
            "feature_weight": round(float(weight), 4),
            "description": FEATURE_DESCRIPTIONS.get(name, f"Model factor: {name}"),
        }
        for name, weight in pairs
    ]
