#!/usr/bin/env python3
"""Export OpenAPI schema for mobile codegen (I79 / external audit #11).

Usage:
  python backend/scripts/export_openapi.py           # write docs/openapi.json
  python backend/scripts/export_openapi.py --check   # exit 1 if committed schema drifts
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("REDIS_URL", "disabled")
os.environ.setdefault("JWT_SECRET", "export-openapi-dev-secret-minimum-32-chars")
os.environ.setdefault("OPENAPI_DOCS_ENABLED", "true")

from app.main import app  # noqa: E402

OUT = ROOT / "docs" / "openapi.json"


def build_schema() -> dict:
    return app.openapi()


def schema_text(schema: dict) -> str:
    return json.dumps(schema, indent=2, sort_keys=True) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        action="store_true",
        help="Fail if docs/openapi.json does not match the live app schema",
    )
    args = parser.parse_args(argv)

    schema = build_schema()
    text = schema_text(schema)
    path_count = len(schema.get("paths") or {})

    if args.check:
        if not OUT.is_file():
            print(f"FAIL missing {OUT}", file=sys.stderr)
            return 1
        committed = OUT.read_text(encoding="utf-8")
        # Normalize committed file the same way (handles older unsorted dumps).
        try:
            committed_norm = schema_text(json.loads(committed))
        except json.JSONDecodeError as e:
            print(f"FAIL {OUT} is not valid JSON: {e}", file=sys.stderr)
            return 1
        if committed_norm != text:
            print(
                f"FAIL OpenAPI drift: {OUT} is out of date with app.openapi().\n"
                f"  paths(live)={path_count}\n"
                "  Fix: python backend/scripts/export_openapi.py "
                "&& cd mobile && npm run codegen:api",
                file=sys.stderr,
            )
            return 1
        print(f"OK OpenAPI in sync ({path_count} paths)")
        return 0

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(text, encoding="utf-8")
    print(f"Wrote {OUT} ({path_count} paths)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
