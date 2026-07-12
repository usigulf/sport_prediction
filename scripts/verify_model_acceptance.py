#!/usr/bin/env python3
"""Verify soccer-wedge model acceptance (docs/MODEL_ACCEPTANCE_PROTOCOL.md).

Examples:
  EXPLANATION_MODEL_DIR=../ml/models ALLOW_HEURISTIC_INFERENCE=false \\
    REQUIRE_PUBLISH_READY_MODEL=true python scripts/verify_model_acceptance.py

  python scripts/verify_model_acceptance.py --api https://api.octobetiq.com --level invite_beta
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request


def _api_check(origin: str, level: str) -> int:
    url = f"{origin.rstrip('/')}/api/v1/stats/model-acceptance?level={level}"
    with urllib.request.urlopen(url, timeout=30) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    print(json.dumps(body, indent=2))
    if body.get("passed"):
        print(f"\nPASS acceptance level={level}", file=sys.stderr)
        return 0
    print(f"\nFAIL acceptance level={level}: {body.get('failed_checks')}", file=sys.stderr)
    return 1


def _local_check(level: str, mobile_soccer_only: bool | None) -> int:
    repo = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    backend = os.path.join(repo, "backend")
    if backend not in sys.path:
        sys.path.insert(0, backend)

    from app.config import get_settings
    from app.services.model_acceptance import evaluate_model_acceptance

    get_settings.cache_clear()
    try:
        result = evaluate_model_acceptance(
            level,  # type: ignore[arg-type]
            mobile_soccer_only=mobile_soccer_only,
        )
    finally:
        get_settings.cache_clear()

    print(json.dumps(result, indent=2))
    if result.get("passed"):
        print(f"\nPASS acceptance level={level}", file=sys.stderr)
        return 0
    print(f"\nFAIL acceptance level={level}: {result.get('failed_checks')}", file=sys.stderr)
    return 1


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--level",
        default="invite_beta",
        choices=("engineering_beta", "invite_beta", "public_charge"),
    )
    p.add_argument(
        "--api",
        default="",
        help="API origin (e.g. https://api.octobetiq.com). If set, skips local BOM.",
    )
    p.add_argument(
        "--require-soccer-only-mobile",
        action="store_true",
        help="Assert mobile soccer-only wedge (local mode only).",
    )
    args = p.parse_args()
    if args.api:
        return _api_check(args.api, args.level)
    mobile = True if args.require_soccer_only_mobile else None
    return _local_check(args.level, mobile)


if __name__ == "__main__":
    raise SystemExit(main())
