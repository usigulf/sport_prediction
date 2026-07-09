#!/usr/bin/env python3
"""Export OpenAPI schema for mobile codegen (I79)."""
from __future__ import annotations

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


def main() -> int:
    schema = app.openapi()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(schema, indent=2), encoding="utf-8")
    print(f"Wrote {OUT} ({len(schema.get('paths', {}))} paths)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
