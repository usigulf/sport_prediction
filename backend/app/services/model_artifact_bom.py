"""Model artifact bill of materials (BOM) for release honesty.

Reports which trained artifacts exist on disk, metrics.json publish readiness,
and whether inference must fail closed vs fall back to heuristics.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.services.model_training import (
    ARTIFACT_FEATURES,
    ARTIFACT_METRICS,
    ARTIFACT_MODEL,
    artifacts_publish_ready,
    load_metrics_json,
)

# League-group subdirs used by resolve_model_dir_for_league
KNOWN_GROUPS = ("football", "soccer", "basketball", "hockey", "baseball")


def _list_artifacts(model_dir: Path) -> list[dict[str, Any]]:
    names = (ARTIFACT_MODEL, ARTIFACT_FEATURES, ARTIFACT_METRICS)
    out: list[dict[str, Any]] = []
    for name in names:
        path = model_dir / name
        item: dict[str, Any] = {"name": name, "present": False}
        try:
            item["present"] = path.is_file()
            if item["present"]:
                item["size_bytes"] = path.stat().st_size
        except OSError:
            pass
        out.append(item)
    return out


def build_model_artifact_bom() -> dict[str, Any]:
    settings = get_settings()
    configured = (settings.model_artifact_dir or settings.explanation_model_dir or "").strip()
    allow_heuristic = bool(getattr(settings, "allow_heuristic_inference", True))
    require_ready = bool(getattr(settings, "require_publish_ready_model", False))

    bom: dict[str, Any] = {
        "configured_dir": configured or None,
        "allow_heuristic_inference": allow_heuristic,
        "require_publish_ready_model": require_ready,
        "publish_ready": False,
        "inference_mode": "heuristic",
        "groups": [],
        "root_artifacts": [],
        "metrics_summary": None,
        "detail": None,
    }

    if not configured:
        bom["detail"] = "MODEL_ARTIFACT_DIR / EXPLANATION_MODEL_DIR not set"
        bom["healthy_for_launch"] = not require_ready
        bom["soccer_wedge"] = {"publish_ready": False, "protocol": "docs/MODEL_ACCEPTANCE_PROTOCOL.md"}
        return bom

    root = Path(configured)
    try:
        is_dir = root.is_dir()
    except OSError:
        is_dir = False
    if not is_dir:
        bom["detail"] = f"Artifact directory does not exist or is inaccessible: {configured}"
        bom["healthy_for_launch"] = not require_ready
        bom["soccer_wedge"] = {"publish_ready": False, "protocol": "docs/MODEL_ACCEPTANCE_PROTOCOL.md"}
        return bom

    bom["root_artifacts"] = _list_artifacts(root)
    metrics = load_metrics_json(str(root))
    if metrics:
        bom["metrics_summary"] = {
            "model_version": metrics.get("model_version"),
            "publish_ready": bool(metrics.get("publish_ready")),
            "status": metrics.get("status"),
            "trained_at": metrics.get("trained_at"),
            "games": metrics.get("games"),
            "eval": metrics.get("eval"),
            "note": metrics.get("note"),
            "publish_block_reasons": metrics.get("publish_block_reasons") or [],
        }

    groups = []
    for name in KNOWN_GROUPS:
        sub = root / name
        try:
            if not sub.is_dir():
                continue
        except OSError:
            continue
        ready = artifacts_publish_ready(str(sub))
        groups.append(
            {
                "league_group": name,
                "path": str(sub),
                "publish_ready": ready,
                "artifacts": _list_artifacts(sub),
            }
        )
    bom["groups"] = groups

    root_ready = artifacts_publish_ready(str(root))
    any_group_ready = any(g["publish_ready"] for g in groups)
    publish_ready = root_ready or any_group_ready
    bom["publish_ready"] = publish_ready

    if publish_ready:
        bom["inference_mode"] = "sklearn"
        bom["detail"] = "Publish-ready sklearn artifacts available"
    elif allow_heuristic:
        bom["inference_mode"] = "heuristic"
        bom["detail"] = "No publish-ready artifacts; heuristic fallback allowed"
    else:
        bom["inference_mode"] = "blocked"
        bom["detail"] = "No publish-ready artifacts; heuristic inference disabled"

    # Launch health: fail closed when required and not ready
    bom["healthy_for_launch"] = publish_ready or (allow_heuristic and not require_ready)

    soccer_ready = any(
        g.get("league_group") == "soccer" and g.get("publish_ready") for g in groups
    )
    root_soccer = bool(
        metrics
        and (
            metrics.get("model_kind") == "soccer_1x2"
            or metrics.get("league_group") == "soccer"
        )
        and metrics.get("publish_ready")
    )
    bom["soccer_wedge"] = {
        "publish_ready": soccer_ready or root_soccer,
        "protocol": "docs/MODEL_ACCEPTANCE_PROTOCOL.md",
    }
    return bom


def model_dir_for_inference() -> str | None:
    """Return configured model dir only when publish-ready; else None."""
    settings = get_settings()
    d = (settings.model_artifact_dir or settings.explanation_model_dir or "").strip()
    if not d:
        return None
    if not artifacts_publish_ready(d):
        # Check league-group subdirs
        root = Path(d)
        if root.is_dir():
            for name in KNOWN_GROUPS:
                sub = root / name
                if sub.is_dir() and artifacts_publish_ready(str(sub)):
                    return d
        return None
    return d
