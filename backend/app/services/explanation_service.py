"""
Explanation service: when a trained model is available, returns real feature importance
for the "Why this prediction?" explanation. Falls back to None so the API can use a stub.
"""
import os
from typing import List, Optional, Tuple

# Human-readable descriptions for known feature names (from train_simple_model.py)
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
    """Load simple_model.pkl and feature_columns.pkl from model_dir. Returns (model, feature_columns) or None."""
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
        if not hasattr(model, "feature_importances_"):
            return None
        return model, list(feature_columns)
    except Exception:
        return None


def get_model_feature_importance(model_dir: Optional[str]) -> Optional[List[dict]]:
    """
    If model_dir is set and contains the simple model, return a list of
    {"feature": str, "shap_value": float, "description": str} sorted by absolute importance.
    Otherwise return None (caller uses stub).
    """
    if not model_dir or not os.path.isdir(model_dir):
        return None
    loaded = _load_model_and_features(model_dir)
    if not loaded:
        return None
    model, feature_columns = loaded
    importances = getattr(model, "feature_importances_", None)
    if importances is None or len(importances) != len(feature_columns):
        return None
    # Build list of (feature_name, importance), sort by abs(importance) desc
    pairs = list(zip(feature_columns, importances.tolist()))
    pairs.sort(key=lambda x: abs(x[1]), reverse=True)
    return [
        {
            "feature": name.replace("_", " ").title(),
            "shap_value": round(float(imp), 4),
            "description": FEATURE_DESCRIPTIONS.get(name, f"Model factor: {name}"),
        }
        for name, imp in pairs
    ]
