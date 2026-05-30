"""
Train a calibrated home-vs-away win model from finished games in the DB and
write the artifacts the inference path already loads:

    <out_dir>/simple_model.pkl      # calibrated sklearn estimator (predict_proba)
    <out_dir>/feature_columns.pkl   # ordered feature names
    <out_dir>/metrics.json          # eval + dataset summary

The model predicts P(home wins | decisive). Draws are excluded from training so
the output is a clean two-way edge; soccer's 1X2 draw arm is added downstream by
`ml_artifacts.soccer_three_way_from_home_edge`. Point inference at the output
dir via MODEL_ARTIFACT_DIR (or EXPLANATION_MODEL_DIR).

Run via backend/train_model.py (Docker: python train_model.py from /app).

Caveat: features use the current standings snapshot (not point-in-time), while
recent-form is computed strictly before each kickoff. Treat backtest metrics as
indicative until point-in-time standings are stored.
"""
from __future__ import annotations

import json
import logging
import os
import pickle
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session, joinedload

from app.models.game import Game
from app.services.feature_builder import build_game_features

logger = logging.getLogger(__name__)

# Order matters: feature_columns.pkl preserves this exact order for inference.
FEATURE_COLUMNS: list[str] = [
    "home_team_win_rate",
    "away_team_win_rate",
    "home_team_avg_score",
    "away_team_avg_score",
    "home_team_recent_form",
    "away_team_recent_form",
    "home_advantage",
    "rest_days_home",
    "rest_days_away",
]

ARTIFACT_MODEL = "simple_model.pkl"
ARTIFACT_FEATURES = "feature_columns.pkl"
ARTIFACT_METRICS = "metrics.json"

# Calibration needs enough samples per class to be stable.
_CALIBRATION_MIN_PER_CLASS = 8
_CALIBRATION_MIN_TOTAL = 40


def _finished_decisive_games(db: Session) -> list[Game]:
    return (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.status.in_(["finished", "final"]))
        .filter(Game.home_team_id.isnot(None), Game.away_team_id.isnot(None))
        .filter(Game.home_score.isnot(None), Game.away_score.isnot(None))
        .filter(Game.home_score != Game.away_score)
        .order_by(Game.scheduled_time.asc())
        .all()
    )


def build_training_frame(db: Session):
    """Return (X DataFrame, y Series of home-win labels, leagues, kickoff times)."""
    import pandas as pd

    games = _finished_decisive_games(db)
    rows: list[list[float]] = []
    labels: list[int] = []
    leagues: list[str] = []
    times: list[Any] = []
    for g in games:
        try:
            feats, _src = build_game_features(g, db)
        except Exception:
            logger.exception("feature build failed for game %s", g.id)
            continue
        rows.append([float(feats.get(c, 0.5)) for c in FEATURE_COLUMNS])
        labels.append(1 if (g.home_score or 0) > (g.away_score or 0) else 0)
        leagues.append((g.league or "").lower())
        times.append(g.scheduled_time)
    X = pd.DataFrame(rows, columns=FEATURE_COLUMNS)
    y = pd.Series(labels, name="home_win", dtype=int)
    return X, y, leagues, times


def _should_calibrate(y) -> bool:
    if len(y) < _CALIBRATION_MIN_TOTAL:
        return False
    counts = y.value_counts()
    return len(counts) >= 2 and int(counts.min()) >= _CALIBRATION_MIN_PER_CLASS


def _make_estimator(calibrate: bool):
    from sklearn.calibration import CalibratedClassifierCV
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    pipe = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=1000, C=1.0)),
        ]
    )
    if calibrate:
        return CalibratedClassifierCV(pipe, method="sigmoid", cv=3)
    return pipe


def _fit_safely(calibrate: bool, X, y):
    """Fit with calibration if requested, falling back to the plain pipeline."""
    est = _make_estimator(calibrate)
    try:
        est.fit(X, y)
        return est, calibrate
    except Exception:
        if not calibrate:
            raise
        est = _make_estimator(False)
        est.fit(X, y)
        return est, False


def train_and_save(
    db: Session,
    out_dir: str,
    *,
    test_frac: float = 0.2,
    min_games: int = 60,
    force: bool = False,
) -> dict:
    import numpy as np
    from sklearn.metrics import accuracy_score, brier_score_loss, log_loss

    X, y, leagues, _times = build_training_frame(db)
    n = len(X)
    if n == 0:
        raise ValueError("No finished decisive games found to train on.")
    if y.nunique() < 2:
        raise ValueError("Training data has only one class (all home or all away wins).")
    if n < min_games and not force:
        raise ValueError(
            f"Only {n} usable games (< min_games={min_games}). "
            "Re-run with force=True to train anyway."
        )

    eval_metrics: dict = {}
    n_test = max(1, int(round(n * test_frac))) if n >= 10 else 0
    if n_test > 0 and n - n_test >= 5:
        X_tr, X_te = X.iloc[: n - n_test], X.iloc[n - n_test :]
        y_tr, y_te = y.iloc[: n - n_test], y.iloc[n - n_test :]
        if y_tr.nunique() >= 2:
            est, calibrated = _fit_safely(_should_calibrate(y_tr), X_tr, y_tr)
            if y_te.nunique() >= 2:
                p = est.predict_proba(X_te)[:, 1]
                base_p = float(y_tr.mean())
                eval_metrics = {
                    "test_games": int(len(y_te)),
                    "accuracy": round(float(accuracy_score(y_te, (p >= 0.5).astype(int))), 4),
                    "log_loss": round(float(log_loss(y_te, p, labels=[0, 1])), 4),
                    "brier": round(float(brier_score_loss(y_te, p)), 4),
                    "baseline_brier": round(
                        float(brier_score_loss(y_te, np.full(len(y_te), base_p))), 4
                    ),
                    "home_rate_test": round(float(y_te.mean()), 4),
                    "calibrated": bool(calibrated),
                }

    # Final model is fit on all available data for production use.
    final, calibrated_full = _fit_safely(_should_calibrate(y), X, y)

    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, ARTIFACT_MODEL), "wb") as f:
        pickle.dump(final, f)
    with open(os.path.join(out_dir, ARTIFACT_FEATURES), "wb") as f:
        pickle.dump(FEATURE_COLUMNS, f)

    summary = {
        "games": int(n),
        "out_dir": os.path.abspath(out_dir),
        "feature_columns": FEATURE_COLUMNS,
        "home_win_rate": round(float(y.mean()), 4),
        "league_counts": dict(Counter(leagues)),
        "calibrated_final": bool(calibrated_full),
        "eval": eval_metrics,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "note": (
            "Predicts P(home | decisive); draws excluded from training. Features use "
            "current standings snapshot (not point-in-time); recent-form is pre-kickoff."
        ),
    }
    with open(os.path.join(out_dir, ARTIFACT_METRICS), "w") as f:
        json.dump(summary, f, indent=2, default=str)
    logger.info("Wrote model artifacts to %s (games=%d)", out_dir, n)
    return summary
