"""Verify audit scaffold scripts exist for blocked-external audit items."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

SCAFFOLD_SCRIPTS = (
    "scripts/verify_offsite_backup_scaffold.sh",
    "scripts/verify_annual_iap_scaffold.sh",
    "scripts/verify_staging_scaffold.sh",
    "scripts/verify_audit_scaffolds.sh",
    "scripts/run_staging_local.sh",
)

SCAFFOLD_DOCS = (
    "docs/OFFSITE_BACKUP_RUNBOOK.md",
    "docs/ANNUAL_IAP_SETUP.md",
    "docs/STAGING_ENVIRONMENT.md",
)


def test_audit_scaffold_scripts_exist():
    for rel in SCAFFOLD_SCRIPTS:
        path = REPO_ROOT / rel
        assert path.is_file(), f"missing {rel}"
        assert path.stat().st_mode & 0o111, f"{rel} should be executable"


def test_audit_scaffold_docs_exist():
    for rel in SCAFFOLD_DOCS:
        assert (REPO_ROOT / rel).is_file(), f"missing {rel}"


def test_external_ops_playbook_exists():
    playbook = REPO_ROOT / "docs/EXTERNAL_OPS_PLAYBOOK.md"
    assert playbook.is_file()
    text = playbook.read_text(encoding="utf-8")
    for section in ("W3", "I50", "I57", "I85"):
        assert section in text


def test_verify_external_ops_script_exists():
    script = REPO_ROOT / "scripts/verify_external_ops_readiness.sh"
    assert script.is_file()
    assert script.stat().st_mode & 0o111


def test_staging_compose_isolated_db():
    text = (REPO_ROOT / "docker-compose.staging.yml").read_text(encoding="utf-8")
    assert "sportsprediction_staging" in text
    assert "8001" in text
