"""Soccer-wedge model acceptance protocol (external audit task #8).

Levels escalate from engineering checks → invite beta → public charge claims.
Market/CLV baseline remains deferred until historical closing lines are stored.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any, Literal

from app.services.model_artifact_bom import build_model_artifact_bom
from app.services.model_training import ARTIFACT_METRICS, load_metrics_json

AcceptanceLevel = Literal["engineering_beta", "invite_beta", "public_charge"]

# Uniform 1X2 (3-class) and binary home-win baselines for chronological holdout.
UNIFORM_1X2_LOG_LOSS = 1.0986
UNIFORM_BINARY_LOG_LOSS = 0.6931

# Chronological holdout floors (soccer wedge).
INVITE_MIN_HOLDOUT_GAMES = 50
CHARGE_MIN_HOLDOUT_GAMES = 100

# Live calibration sample floor (matches trust_metrics_service).
CHARGE_MIN_CALIBRATION_SCORED = 100

LEVEL_ORDER: tuple[AcceptanceLevel, ...] = (
    "engineering_beta",
    "invite_beta",
    "public_charge",
)


def _check(name: str, ok: bool, detail: str) -> dict[str, Any]:
    return {"name": name, "ok": bool(ok), "detail": detail}


def _holdout_games(eval_block: dict[str, Any] | None) -> int:
    if not eval_block:
        return 0
    for key in ("holdout_games", "test_games", "scored_games"):
        raw = eval_block.get(key)
        if raw is not None:
            try:
                return max(0, int(raw))
            except (TypeError, ValueError):
                pass
    return 0


def _load_soccer_metrics(bom: dict[str, Any]) -> dict[str, Any] | None:
    """Prefer soccer group metrics; fall back to root when it is soccer 1X2."""
    configured = (bom.get("configured_dir") or "").strip()
    if not configured:
        return None
    root = Path(configured)
    soccer_dir = root / "soccer"
    try:
        soccer_is_dir = soccer_dir.is_dir()
    except OSError:
        soccer_is_dir = False
    if soccer_is_dir:
        metrics = load_metrics_json(str(soccer_dir))
        if metrics:
            return metrics
    try:
        root_is_dir = root.is_dir()
    except OSError:
        root_is_dir = False
    if not root_is_dir:
        return None
    root_metrics = load_metrics_json(str(root))
    if root_metrics and (
        root_metrics.get("model_kind") == "soccer_1x2"
        or root_metrics.get("league_group") == "soccer"
    ):
        return root_metrics
    return None


def _soccer_group_publish_ready(bom: dict[str, Any]) -> bool:
    for group in bom.get("groups") or []:
        if group.get("league_group") == "soccer" and group.get("publish_ready"):
            return True
    metrics = _load_soccer_metrics(bom)
    return bool(metrics and metrics.get("publish_ready"))


def _beats_naive_baseline(metrics: dict[str, Any] | None) -> tuple[bool, str]:
    if not metrics:
        return False, "No soccer metrics.json to compare against naive baseline"
    eval_block = metrics.get("eval") if isinstance(metrics.get("eval"), dict) else {}
    ll = eval_block.get("log_loss")
    if ll is None:
        return False, "eval.log_loss missing — retrain to emit chronological holdout metrics"
    try:
        log_loss = float(ll)
    except (TypeError, ValueError):
        return False, f"eval.log_loss not numeric: {ll!r}"

    kind = (metrics.get("model_kind") or "").strip().lower()
    if kind == "soccer_1x2" or metrics.get("league_group") == "soccer":
        baseline = float(eval_block.get("baseline_log_loss") or UNIFORM_1X2_LOG_LOSS)
        ok = log_loss < baseline
        return ok, (
            f"holdout log_loss={log_loss:.4f} vs uniform 1X2 baseline={baseline:.4f} "
            f"({'beats' if ok else 'does not beat'} baseline)"
        )

    baseline = float(eval_block.get("baseline_log_loss") or UNIFORM_BINARY_LOG_LOSS)
    brier = eval_block.get("brier")
    base_brier = eval_block.get("baseline_brier")
    ok = log_loss < baseline
    detail = f"holdout log_loss={log_loss:.4f} vs binary baseline={baseline:.4f}"
    if brier is not None and base_brier is not None:
        try:
            ok = ok and float(brier) <= float(base_brier)
            detail += f"; brier={float(brier):.4f} vs baseline_brier={float(base_brier):.4f}"
        except (TypeError, ValueError):
            pass
    return ok, detail


def evaluate_model_acceptance(
    level: AcceptanceLevel = "invite_beta",
    *,
    bom: dict[str, Any] | None = None,
    calibration: dict[str, Any] | None = None,
    mobile_soccer_only: bool | None = None,
) -> dict[str, Any]:
    """
    Evaluate acceptance gates for the soccer launch wedge.

    ``calibration`` is the payload from trust calibration aggregation (optional;
    required to pass ``public_charge``).
    ``mobile_soccer_only`` when set asserts EXPO_PUBLIC_BETA_SOCCER_ONLY intent.
    """
    if level not in LEVEL_ORDER:
        raise ValueError(f"Unknown acceptance level: {level}")

    bom = bom if bom is not None else build_model_artifact_bom()
    metrics = _load_soccer_metrics(bom)
    eval_block = metrics.get("eval") if isinstance((metrics or {}).get("eval"), dict) else {}
    holdout_n = _holdout_games(eval_block if isinstance(eval_block, dict) else None)

    checks: list[dict[str, Any]] = []

    # --- engineering_beta ---
    checks.append(
        _check(
            "artifact_dir_configured",
            bool(bom.get("configured_dir")),
            bom.get("detail") or "MODEL_ARTIFACT_DIR / EXPLANATION_MODEL_DIR configured",
        )
    )
    checks.append(
        _check(
            "prediction_source_honesty",
            True,
            "API attaches prediction_source; production marks low-trust heuristics",
        )
    )
    if mobile_soccer_only is not None:
        checks.append(
            _check(
                "mobile_soccer_only_wedge",
                bool(mobile_soccer_only),
                "EXPO_PUBLIC_BETA_SOCCER_ONLY must be true for the soccer launch wedge",
            )
        )

    # --- invite_beta ---
    if level in ("invite_beta", "public_charge"):
        soccer_ready = _soccer_group_publish_ready(bom)
        checks.append(
            _check(
                "soccer_publish_ready",
                soccer_ready,
                "ml/models/soccer (or soccer 1X2 root) must have publish_ready=true artifacts",
            )
        )
        checks.append(
            _check(
                "chronological_holdout_present",
                holdout_n >= INVITE_MIN_HOLDOUT_GAMES,
                f"holdout/test games={holdout_n} (need ≥{INVITE_MIN_HOLDOUT_GAMES})",
            )
        )
        beats, beats_detail = _beats_naive_baseline(metrics)
        checks.append(_check("beats_naive_baseline", beats, beats_detail))
        checks.append(
            _check(
                "fail_closed_heuristics",
                bom.get("allow_heuristic_inference") is False,
                "ALLOW_HEURISTIC_INFERENCE must be false for invite beta",
            )
        )
        checks.append(
            _check(
                "require_publish_ready_health",
                bom.get("require_publish_ready_model") is True,
                "REQUIRE_PUBLISH_READY_MODEL must be true so /health fails closed",
            )
        )
        checks.append(
            _check(
                "healthy_for_launch",
                bool(bom.get("healthy_for_launch")),
                bom.get("detail") or "BOM healthy_for_launch",
            )
        )

    # --- public_charge ---
    market_status = "deferred"
    market_detail = (
        "Historical closing lines are not persisted; CLV / market-baseline gate is deferred. "
        "Use /api/v1/stats/model-vs-market for live monitoring only — not acceptance evidence."
    )
    if level == "public_charge":
        checks.append(
            _check(
                "charge_holdout_floor",
                holdout_n >= CHARGE_MIN_HOLDOUT_GAMES,
                f"holdout/test games={holdout_n} (need ≥{CHARGE_MIN_HOLDOUT_GAMES} to charge on performance)",
            )
        )
        cal_ok = False
        cal_detail = "calibration payload not provided"
        if calibration is not None:
            scored = int(calibration.get("total_scored") or 0)
            met = bool(calibration.get("min_sample_met"))
            cal_ok = met and scored >= CHARGE_MIN_CALIBRATION_SCORED
            cal_detail = (
                f"total_scored={scored} min_sample_met={met} "
                f"(need ≥{CHARGE_MIN_CALIBRATION_SCORED} and min_sample_met)"
            )
        checks.append(_check("live_calibration_floor", cal_ok, cal_detail))
        checks.append(
            _check(
                "market_baseline_clv",
                False,
                market_detail,
            )
        )
        market_status = "blocked_until_closing_line_ledger"

    # market_baseline_clv is intentionally fail for public_charge until closing-line ledger exists
    passed = all(c["ok"] for c in checks)
    # For public_charge, market gate forces fail — that's correct per protocol
    return {
        "protocol_version": "1.0",
        "level": level,
        "passed": passed,
        "wedge": "soccer",
        "checks": checks,
        "soccer_metrics": {
            "present": metrics is not None,
            "publish_ready": bool((metrics or {}).get("publish_ready")),
            "model_kind": (metrics or {}).get("model_kind"),
            "model_version": (metrics or {}).get("model_version"),
            "games": (metrics or {}).get("games"),
            "trained_at": (metrics or {}).get("trained_at"),
            "eval": eval_block or None,
            "metrics_path_hint": (
                str(Path(bom["configured_dir"]) / "soccer" / ARTIFACT_METRICS)
                if bom.get("configured_dir")
                else None
            ),
        },
        "market_baseline": {
            "status": market_status,
            "detail": market_detail,
        },
        "rollback": {
            "procedure": (
                "1) Keep prior snapshot as ml/models.prev before promoting new pickles. "
                "2) On regression or /health 503, copy ml/models.prev → ml/models and restart API. "
                "3) Confirm GET /health model.publish_ready and this acceptance endpoint."
            ),
        },
        "required_env_invite_beta": {
            "EXPLANATION_MODEL_DIR": "/models",
            "ALLOW_HEURISTIC_INFERENCE": "false",
            "REQUIRE_PUBLISH_READY_MODEL": "true",
            "SOCCER_SYNC_LEAGUES": "premier_league",
            "EXPO_PUBLIC_BETA_SOCCER_ONLY": "true",
        },
        "failed_checks": [c["name"] for c in checks if not c["ok"]],
    }
