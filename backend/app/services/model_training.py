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

Caveat: features use point-in-time standings rebuilt from finished league games
before each kickoff when enough history exists; otherwise they fall back to the
current `team_standings` snapshot or provider APIs.
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
from app.constants.soccer import SOCCER_LEAGUES_SET
from app.services.feature_builder import build_game_features
from app.services.point_in_time_standings import PitStandingsCache

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


def league_group(league: str) -> str:
    """Coarse bucket for publish readiness (football / basketball / soccer / other)."""
    lg = (league or "").strip().lower()
    if lg == "nfl":
        return "football"
    if lg == "nba":
        return "basketball"
    if lg in SOCCER_LEAGUES_SET:
        return "soccer"
    return lg or "other"


def assess_publish_readiness(
    leagues: list[str],
    *,
    n: int,
    test_frac: float,
    min_holdout_per_group: int,
) -> tuple[bool, list[str], dict[str, int], dict[str, int]]:
    """
    Require each represented league group to have enough decisive games in the full
    training corpus before publishing sklearn artifacts (H-07 / M-07).

    ``min_holdout_per_group`` is the minimum **corpus** size per league group (legacy
    env name). A small chronological holdout slice is still computed for eval metrics.
    """
    n_test = max(1, int(round(n * test_frac))) if n >= 10 else 0
    holdout_leagues = leagues[n - n_test :] if n_test else []
    corpus_counts = Counter(league_group(lg) for lg in leagues)
    holdout_counts = Counter(league_group(lg) for lg in holdout_leagues)

    reasons: list[str] = []
    for group, total in sorted(corpus_counts.items()):
        if total < min_holdout_per_group:
            holdout_n = holdout_counts.get(group, 0)
            reasons.append(
                f"{group}: corpus has {total} decisive games "
                f"(< {min_holdout_per_group}; holdout={holdout_n})."
            )
    return len(reasons) == 0, reasons, dict(corpus_counts), dict(holdout_counts)


def load_metrics_json(model_dir: str) -> dict[str, Any] | None:
    path = os.path.join(model_dir, ARTIFACT_METRICS)
    if not os.path.isfile(path):
        return None
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else None
    except Exception:
        logger.warning("Could not read %s", path)
        return None


def resolve_model_dir_for_league(base_dir: str, league: str) -> str | None:
    """Pick per-group artifact dir when published; supports legacy flat layout."""
    if not base_dir:
        return None
    group = league_group(league)
    sub = os.path.join(base_dir, group)
    sub_metrics = load_metrics_json(sub)
    if sub_metrics and sub_metrics.get("publish_ready"):
        return sub
    root_metrics = load_metrics_json(base_dir)
    if root_metrics and root_metrics.get("mode") != "per_league_group":
        if root_metrics.get("publish_ready") and os.path.isfile(os.path.join(base_dir, ARTIFACT_MODEL)):
            return base_dir
    return None


def artifacts_publish_ready(model_dir: str | None) -> bool:
    """
    H-07: inference and explainability use ML artifacts only when training marked them publish-ready.
    Missing metrics.json is treated as warming (heuristic fallback).
    """
    if not model_dir or not os.path.isdir(model_dir):
        return False
    metrics = load_metrics_json(model_dir)
    if metrics is None:
        return False
    if metrics.get("publish_ready"):
        return True
    if metrics.get("mode") == "per_league_group":
        for group in LEAGUE_GROUP_ORDER:
            sub = os.path.join(model_dir, group)
            sub_metrics = load_metrics_json(sub)
            if sub_metrics and sub_metrics.get("publish_ready"):
                return True
    return False


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


LEAGUE_GROUP_ORDER: tuple[str, ...] = ("basketball", "football", "soccer")


def build_training_frame(db: Session, *, group: str | None = None):
    """Return (X DataFrame, y Series of home-win labels, leagues, kickoff times)."""
    import pandas as pd

    games = _finished_decisive_games(db)
    if group:
        games = [g for g in games if league_group(g.league or "") == group]
    pit_cache = PitStandingsCache.from_games(db, games)
    rows: list[list[float]] = []
    labels: list[int] = []
    leagues: list[str] = []
    times: list[Any] = []
    for g in games:
        try:
            feats, _src = build_game_features(g, db, pit_cache=pit_cache)
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
    min_publish_holdout_per_league_group: int | None = None,
    force: bool = False,
) -> dict:
    """Train one sklearn model per league group (M-02) into ``out_dir/{group}/``."""
    return train_all_league_groups(
        db,
        out_dir,
        test_frac=test_frac,
        min_games=min_games,
        min_publish_holdout_per_league_group=min_publish_holdout_per_league_group,
        force=force,
    )


def _train_single_group(
    X,
    y,
    leagues: list[str],
    out_dir: str,
    *,
    group: str,
    test_frac: float,
    min_publish_holdout_per_league_group: int,
    force: bool,
) -> dict:
    import numpy as np
    from sklearn.metrics import accuracy_score, brier_score_loss, log_loss

    n = len(X)
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

    final, calibrated_full = _fit_safely(_should_calibrate(y), X, y)

    publish_ready, publish_block_reasons, corpus_by_group, holdout_by_group = assess_publish_readiness(
        leagues,
        n=n,
        test_frac=test_frac,
        min_holdout_per_group=min_publish_holdout_per_league_group,
    )
    write_artifacts = publish_ready or force

    os.makedirs(out_dir, exist_ok=True)
    if write_artifacts:
        with open(os.path.join(out_dir, ARTIFACT_MODEL), "wb") as f:
            pickle.dump(final, f)
        with open(os.path.join(out_dir, ARTIFACT_FEATURES), "wb") as f:
            pickle.dump(FEATURE_COLUMNS, f)
    else:
        for name in (ARTIFACT_MODEL, ARTIFACT_FEATURES):
            path = os.path.join(out_dir, name)
            if os.path.isfile(path):
                os.remove(path)

    summary = {
        "league_group": group,
        "games": int(n),
        "out_dir": os.path.abspath(out_dir),
        "feature_columns": FEATURE_COLUMNS,
        "home_win_rate": round(float(y.mean()), 4),
        "league_counts": dict(Counter(leagues)),
        "league_group_corpus_counts": corpus_by_group,
        "league_group_holdout_counts": holdout_by_group,
        "calibrated_final": bool(calibrated_full),
        "eval": eval_metrics,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "publish_ready": bool(publish_ready),
        "publish_block_reasons": publish_block_reasons,
        "min_publish_holdout_per_league_group": int(min_publish_holdout_per_league_group),
        "artifacts_written": bool(write_artifacts),
        "model_version": f"sklearn_{group}",
        "note": (
            "Predicts P(home | decisive); draws excluded from training. Standings "
            "features are point-in-time from finished league games before kickoff "
            "when enough history exists; recent-form is always pre-kickoff."
        ),
    }
    if not publish_ready and not force:
        summary["status"] = "warming"
        summary["note"] += (
            f" Model artifacts were not published — need ≥{min_publish_holdout_per_league_group} "
            f"decisive games in the {group} corpus."
        )
    elif publish_ready:
        summary["status"] = "ready"
    else:
        summary["status"] = "forced"
    with open(os.path.join(out_dir, ARTIFACT_METRICS), "w") as f:
        json.dump(summary, f, indent=2, default=str)
    if not write_artifacts:
        logger.warning(
            "Training %s blocked (%s); metrics only in %s",
            group,
            "; ".join(publish_block_reasons),
            out_dir,
        )
    else:
        logger.info("Wrote %s model artifacts to %s (games=%d)", group, out_dir, n)
    return summary


def train_all_league_groups(
    db: Session,
    out_dir: str,
    *,
    test_frac: float = 0.2,
    min_games: int = 60,
    min_publish_holdout_per_league_group: int | None = None,
    force: bool = False,
) -> dict:
    from app.config import get_settings

    if min_publish_holdout_per_league_group is None:
        min_publish_holdout_per_league_group = int(
            get_settings().min_publish_holdout_per_league_group
        )

    groups_summary: dict[str, Any] = {}
    total_games = 0
    any_ready = False
    any_written = False

    for group in LEAGUE_GROUP_ORDER:
        X, y, leagues, _times = build_training_frame(db, group=group)
        n = len(X)
        total_games += n
        sub_dir = os.path.join(out_dir, group)
        if n == 0:
            groups_summary[group] = {
                "league_group": group,
                "status": "no_data",
                "games": 0,
                "publish_ready": False,
                "artifacts_written": False,
            }
            continue
        if n < min_games and not force:
            groups_summary[group] = {
                "league_group": group,
                "status": "skipped",
                "games": int(n),
                "publish_ready": False,
                "artifacts_written": False,
                "reason": f"< min_games={min_games}",
            }
            continue
        if y.nunique() < 2:
            groups_summary[group] = {
                "league_group": group,
                "status": "skipped",
                "games": int(n),
                "publish_ready": False,
                "artifacts_written": False,
                "reason": "single class in labels",
            }
            continue
        summary = _train_single_group(
            X,
            y,
            leagues,
            sub_dir,
            group=group,
            test_frac=test_frac,
            min_publish_holdout_per_league_group=min_publish_holdout_per_league_group,
            force=force,
        )
        groups_summary[group] = summary
        any_ready = any_ready or bool(summary.get("publish_ready"))
        any_written = any_written or bool(summary.get("artifacts_written"))

    if total_games == 0:
        raise ValueError("No finished decisive games found to train on.")
    if not any_written and total_games < min_games and not force:
        raise ValueError(
            f"Only {total_games} usable games (< min_games={min_games}). "
            "Re-run with force=True to train anyway."
        )

    index = {
        "mode": "per_league_group",
        "games": total_games,
        "out_dir": os.path.abspath(out_dir),
        "groups": groups_summary,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "publish_ready": any_ready,
        "artifacts_written": any_written,
        "min_publish_holdout_per_league_group": int(min_publish_holdout_per_league_group),
        "status": "ready" if any_ready else ("forced" if any_written else "warming"),
    }
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, ARTIFACT_METRICS), "w") as f:
        json.dump(index, f, indent=2, default=str)
    return index
