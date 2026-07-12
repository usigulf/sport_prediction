"""OpenAPI export + drift check (I79 / external audit #11)."""
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
EXPORT = REPO_ROOT / "backend" / "scripts" / "export_openapi.py"
OUT = REPO_ROOT / "docs" / "openapi.json"

# Paths added in recent trust/acceptance work — must stay in the committed schema.
REQUIRED_PATH_FRAGMENTS = (
    "/api/v1/tools/parlay-correlation",
    "/api/v1/stats/model-acceptance",
    "/api/v1/stats/model-vs-closing",
    "/api/v1/stats/forecast-ledger",
    "/api/v1/user/me/privacy/ccpa-opt-out",
)


def test_openapi_export_script_exists():
    assert EXPORT.is_file()


def test_committed_openapi_has_required_paths():
    assert OUT.is_file()
    text = OUT.read_text(encoding="utf-8")
    data = json.loads(text)
    assert data.get("openapi")
    paths = data.get("paths") or {}
    joined = "\n".join(paths.keys())
    for frag in REQUIRED_PATH_FRAGMENTS:
        assert frag in joined, f"missing OpenAPI path {frag}"


def test_openapi_schema_matches_app():
    """CI gate: committed docs/openapi.json must match live FastAPI schema."""
    result = subprocess.run(
        [sys.executable, str(EXPORT), "--check"],
        cwd=str(REPO_ROOT),
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr or result.stdout
