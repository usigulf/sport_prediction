"""
Chronological walk-forward backtest for league-group sklearn models.

Each fold trains on all finished games before the test window (expanding window),
scores held-out fixtures with point-in-time features, and aggregates accuracy /
log-loss using the same rules as production trust metrics.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.prediction import Prediction
from app.services.feature_builder import build_game_features
from app.services.ml_artifacts import predict_with_estimator, soccer_three_way_from_home_edge
from app.services.model_training import (
    LEAGUE_GROUP_ORDER,
    MODEL_KIND_BINARY,
    MODEL_KIND_SOCCER_1X2,
    SOCCER_1X2_LABEL_AWAY,
    SOCCER_1X2_LABEL_DRAW,
    SOCCER_1X2_LABEL_HOME,
    _finished_decisive_games,
    _finished_soccer_games,
    _fit_safely,
    _should_calibrate,
    _should_calibrate_multiclass,
    build_training_frame_from_games,
    league_group,
)
from app.services.point_in_time_standings import PitStandingsCache
from app.services.trust_metrics_service import prediction_correct_vs_result

logger = logging.getLogger(__name__)


def _games_for_group(db: Session, group: str) -> list[Game]:
    if group == "soccer":
        return _finished_soccer_games(db)
    return [
        g
        for g in _finished_decisive_games(db)
        if league_group(g.league or "") == group
    ]


def walk_forward_fold_ranges(
    n_games: int,
    *,
    min_train_games: int,
    test_window_games: int,
) -> list[tuple[int, int]]:
    """Return (test_start, test_end) indices for expanding-window folds."""
    if min_train_games < 1 or test_window_games < 1:
        return []
    folds: list[tuple[int, int]] = []
    test_start = min_train_games
    while test_start < n_games:
        test_end = min(test_start + test_window_games, n_games)
        if test_end <= test_start:
            break
        folds.append((test_start, test_end))
        test_start = test_end
    return folds


def _model_kind_for_group(group: str) -> str:
    return MODEL_KIND_SOCCER_1X2 if group == "soccer" else MODEL_KIND_BINARY


def _actual_label(game: Game, *, group: str) -> int:
    hs = game.home_score or 0
    aws = game.away_score or 0
    if group == "soccer":
        if hs > aws:
            return SOCCER_1X2_LABEL_HOME
        if hs == aws:
            return SOCCER_1X2_LABEL_DRAW
        return SOCCER_1X2_LABEL_AWAY
    return 1 if hs > aws else 0


def _prediction_row(game: Game, payload: dict[str, Any]) -> Prediction:
    return Prediction(
        game_id=game.id,
        model_version="walk_forward",
        home_win_probability=payload["home_win_probability"],
        away_win_probability=payload["away_win_probability"],
        confidence_level=str(payload.get("confidence_level") or "medium"),
    )


def _predict_game(
    estimator,
    game: Game,
    db: Session,
    pit_cache: PitStandingsCache,
    *,
    group: str,
) -> dict[str, Any] | None:
    try:
        features, _src = build_game_features(game, db, pit_cache=pit_cache)
    except Exception:
        logger.exception("feature build failed for backtest game %s", game.id)
        return None
    out = predict_with_estimator(
        estimator,
        features,
        model_kind=_model_kind_for_group(group),
        model_version="walk_forward",
    )
    if out is None:
        return None
    if group == "soccer" and not out.get("native_1x2"):
        home_p, draw_p, away_p = soccer_three_way_from_home_edge(float(out["home_win_probability"]))
        out["home_win_probability"] = home_p
        out["away_win_probability"] = away_p
    return out


def _score_fold(
    estimator,
    train_games: list[Game],
    test_games: list[Game],
    db: Session,
    *,
    group: str,
) -> dict[str, Any]:
    import numpy as np
    from sklearn.metrics import log_loss

    pit_cache = PitStandingsCache.from_games(db, train_games + test_games)
    y_true: list[int] = []
    y_prob_rows: list[list[float]] = []
    classes: list[int] = []
    correct = 0
    scored = 0

    for game in test_games:
        payload = _predict_game(estimator, game, db, pit_cache, group=group)
        if payload is None:
            continue
        pred = _prediction_row(game, payload)
        label = _actual_label(game, group=group)
        y_true.append(label)
        scored += 1
        if prediction_correct_vs_result(game, pred):
            correct += 1
        proba = payload.get("_proba")
        fold_classes = payload.get("_classes")
        if proba and fold_classes:
            if not classes:
                classes = [int(c) for c in fold_classes]
            y_prob_rows.append([float(p) for p in proba])

    metrics: dict[str, Any] = {
        "scored_games": scored,
        "correct": correct,
    }
    if scored > 0:
        metrics["accuracy"] = round(correct / scored, 4)
    if y_true and y_prob_rows and classes:
        try:
            metrics["log_loss"] = round(
                float(log_loss(y_true, np.array(y_prob_rows), labels=classes)),
                4,
            )
        except Exception:
            logger.exception("log_loss failed for %s fold", group)
    return metrics


def run_walk_forward_backtest(
    db: Session,
    *,
    min_train_games: int = 60,
    test_window_games: int = 20,
    groups: list[str] | None = None,
) -> dict[str, Any]:
    """
    Expanding-window walk-forward evaluation per league group.

    Returns a JSON-serializable report with per-fold and aggregate metrics.
    """
    selected = [g for g in (groups or list(LEAGUE_GROUP_ORDER)) if g in LEAGUE_GROUP_ORDER]
    report: dict[str, Any] = {
        "mode": "walk_forward_expanding",
        "min_train_games": int(min_train_games),
        "test_window_games": int(test_window_games),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "groups": {},
    }

    for group in selected:
        games = _games_for_group(db, group)
        n = len(games)
        fold_ranges = walk_forward_fold_ranges(
            n,
            min_train_games=min_train_games,
            test_window_games=test_window_games,
        )
        group_report: dict[str, Any] = {
            "total_games": n,
            "folds": [],
            "aggregate": {},
        }
        if not fold_ranges:
            group_report["status"] = "insufficient_data"
            report["groups"][group] = group_report
            continue

        total_scored = 0
        total_correct = 0
        log_losses: list[float] = []
        multiclass = group == "soccer"

        for fold_idx, (test_start, test_end) in enumerate(fold_ranges):
            train_games = games[:test_start]
            test_games = games[test_start:test_end]
            X_tr, y_tr, _leagues, _times = build_training_frame_from_games(
                db, train_games, group=group
            )
            if len(X_tr) < min_train_games or y_tr.nunique() < 2:
                group_report["folds"].append(
                    {
                        "fold_index": fold_idx,
                        "status": "skipped",
                        "reason": "insufficient train rows or single class",
                        "train_games": len(X_tr),
                        "test_games": len(test_games),
                    }
                )
                continue
            calibrate = (
                _should_calibrate_multiclass(y_tr) if multiclass else _should_calibrate(y_tr)
            )
            estimator, calibrated = _fit_safely(calibrate, X_tr, y_tr, multiclass=multiclass)
            fold_metrics = _score_fold(estimator, train_games, test_games, db, group=group)
            fold_entry = {
                "fold_index": fold_idx,
                "status": "ok",
                "train_games": len(X_tr),
                "test_games": len(test_games),
                "test_start_index": test_start,
                "test_end_index": test_end,
                "calibrated": bool(calibrated),
                **fold_metrics,
            }
            group_report["folds"].append(fold_entry)
            total_scored += int(fold_metrics.get("scored_games") or 0)
            total_correct += int(fold_metrics.get("correct") or 0)
            if fold_metrics.get("log_loss") is not None:
                log_losses.append(float(fold_metrics["log_loss"]))

        if total_scored > 0:
            group_report["aggregate"] = {
                "scored_games": total_scored,
                "correct": total_correct,
                "accuracy": round(total_correct / total_scored, 4),
            }
            if log_losses:
                mean_ll = sum(log_losses) / len(log_losses)
                group_report["aggregate"]["mean_log_loss"] = round(mean_ll, 4)
                baseline_ll = 1.0986 if multiclass else 0.6931
                group_report["aggregate"]["baseline_mean_log_loss"] = baseline_ll
            group_report["status"] = "ok"
        else:
            group_report["status"] = "no_scored_folds"

        report["groups"][group] = group_report

    report["market_benchmark"] = {
        "status": "not_available",
        "reason": (
            "Historical closing lines are not persisted in the database. "
            "Use GET /stats/model-vs-market for live model-vs-consensus edges on upcoming games."
        ),
        "live_endpoint": "/api/v1/stats/model-vs-market",
    }

    from app.services.ensemble_gating_service import assess_ensemble_eligibility

    report["ensemble_gate"] = assess_ensemble_eligibility(report)

    return report
