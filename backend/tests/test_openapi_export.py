"""OpenAPI export for codegen (I79)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_openapi_export_script_exists():
    path = REPO_ROOT / "backend" / "scripts" / "export_openapi.py"
    assert path.is_file()


def test_openapi_json_generated():
    import subprocess
    import sys

    subprocess.run(
        [sys.executable, str(REPO_ROOT / "backend" / "scripts" / "export_openapi.py")],
        check=True,
        cwd=str(REPO_ROOT),
    )
    out = REPO_ROOT / "docs" / "openapi.json"
    assert out.is_file()
    text = out.read_text(encoding="utf-8")
    assert "/api/v1/tools/parlay-correlation" in text
    assert "openapi" in text
