"""CI workflow must enforce Ruff (P1-003) and dependency audits (P1-004)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_ci_ruff_step_fails_on_violations():
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    assert "ruff check app tests" in ci
    assert "ruff check" not in ci or "|| true" not in ci.split("ruff check")[1].split("Pytest")[0]


def test_requirements_dev_includes_ruff():
    dev = (REPO_ROOT / "backend" / "requirements-dev.txt").read_text(encoding="utf-8")
    assert "ruff" in dev


def test_ci_runs_pip_audit_without_swallowing_errors():
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    assert "pip_audit_backend.sh" in ci
    pip_section = ci.split("pip-audit")[1].split("Pytest")[0]
    assert "|| true" not in pip_section


def test_ci_runs_npm_audit_on_production_deps():
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    assert "npm audit --omit=dev --audit-level=high" in ci


def test_requirements_dev_includes_pip_audit():
    dev = (REPO_ROOT / "backend" / "requirements-dev.txt").read_text(encoding="utf-8")
    assert "pip-audit" in dev


def test_pip_audit_script_runs_clean_audit():
    script = (REPO_ROOT / "scripts" / "pip_audit_backend.sh").read_text(encoding="utf-8")
    assert "pip-audit -r requirements.txt" in script
    assert "ignore-vuln" not in script


def test_backend_requirements_are_pinned_not_loose():
    req = (REPO_ROOT / "backend" / "requirements.txt").read_text(encoding="utf-8")
    assert "python-multipart==" in req
    assert "python-dotenv==" in req
    assert "pillow==" in req.lower()
    assert "starlette==1.3.1" in req


def test_mobile_overrides_patch_high_audit_findings():
    pkg = (REPO_ROOT / "mobile" / "package.json").read_text(encoding="utf-8")
    assert '"@xmldom/xmldom": "^0.9.10"' in pkg
    assert '"tar": "^7.5.19"' in pkg


def test_ci_enforces_sixty_percent_coverage():
    ci = (REPO_ROOT / ".github" / "workflows" / "ci.yml").read_text(encoding="utf-8")
    pytest_ini = (REPO_ROOT / "pytest.ini").read_text(encoding="utf-8")
    assert "--cov-fail-under=60" in ci
    assert "--cov-fail-under=60" in pytest_ini
