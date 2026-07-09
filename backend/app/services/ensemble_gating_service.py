"""Ensemble deployment gate (I99) — only enable when backtest proves lift."""
from __future__ import annotations

from typing import Any

# Minimum relative log-loss improvement vs single-model baseline to allow ensemble.
MIN_LOG_LOSS_LIFT = 0.01


def assess_ensemble_eligibility(backtest_report: dict[str, Any] | None) -> dict[str, Any]:
    """
    Production ships a single calibrated logistic model per league group.
    Ensemble stacking stays disabled until walk-forward backtest documents lift.
    """
    if not backtest_report:
        return {
            "ensemble_eligible": False,
            "reason": "no_backtest_report",
            "detail": "Run walk_forward_backtest before evaluating ensemble eligibility.",
        }

    groups = backtest_report.get("groups") or {}
    lifts: dict[str, float] = {}
    eligible_groups: list[str] = []
    for group, report in groups.items():
        agg = (report or {}).get("aggregate") or {}
        ll = agg.get("mean_log_loss")
        baseline = agg.get("baseline_mean_log_loss")
        if ll is None or baseline is None:
            continue
        lift = float(baseline) - float(ll)
        lifts[group] = round(lift, 4)
        if lift >= MIN_LOG_LOSS_LIFT:
            eligible_groups.append(group)

    if eligible_groups:
        return {
            "ensemble_eligible": True,
            "eligible_groups": eligible_groups,
            "log_loss_lift_by_group": lifts,
            "min_lift_required": MIN_LOG_LOSS_LIFT,
        }

    return {
        "ensemble_eligible": False,
        "reason": "insufficient_lift",
        "log_loss_lift_by_group": lifts,
        "min_lift_required": MIN_LOG_LOSS_LIFT,
        "detail": (
            "Ensemble remains disabled — current walk-forward folds do not beat "
            "single-model baseline by the required margin."
        ),
    }


def ensemble_block_reason_for_metrics(metrics: dict[str, Any] | None) -> str:
    if not metrics:
        return "no_metrics"
    if metrics.get("ensemble_eligible"):
        return ""
    return str(metrics.get("ensemble_gate_reason") or "ensemble_not_proven")
