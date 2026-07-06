"""Deploy API script must run migrations and fail closed (P1-002)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_deploy_api_runs_alembic_before_restart():
    script = (REPO_ROOT / "scripts" / "deploy_api.sh").read_text(encoding="utf-8")
    assert "alembic upgrade head" in script
    assert "set -euo pipefail" in script
    # Must not swallow migration failures (pattern used in launch_soccer_beta.sh).
    assert "alembic upgrade head ||" not in script


def test_deploy_api_builds_before_migrate():
    script = (REPO_ROOT / "scripts" / "deploy_api.sh").read_text(encoding="utf-8")
    lines = [ln for ln in script.splitlines() if ln.strip() and not ln.lstrip().startswith("#")]
    joined = "\n".join(lines)
    build_idx = joined.index('build api')
    migrate_idx = joined.index("alembic upgrade head")
    up_idx = joined.index("up -d api")
    assert build_idx < migrate_idx < up_idx
