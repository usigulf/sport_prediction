"""Deploy backup scripts and crontab template (P0-010)."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_backup_scripts_exist_and_reference_offsite():
    run_script = REPO_ROOT / "scripts" / "run_pg_backup.sh"
    offsite = REPO_ROOT / "scripts" / "pg_backup_offsite_copy.sh"
    local = REPO_ROOT / "scripts" / "pg_backup_docker.sh"
    setup = REPO_ROOT / "scripts" / "setup_db_backup_cron.sh"
    for path in (run_script, offsite, local, setup):
        assert path.is_file(), f"missing {path}"
    text = offsite.read_text(encoding="utf-8")
    assert "OFFSITE_BACKUP_SCP_TARGET" in text
    assert "OFFSITE_BACKUP_S3_URI" in text
    assert "AWS_ENDPOINT_URL" in text
    assert "run_pg_backup.sh" in run_script.read_text(encoding="utf-8")
    assert "AWS_ACCESS_KEY_ID" in run_script.read_text(encoding="utf-8")


def test_crontab_example_includes_daily_backup():
    crontab = (REPO_ROOT / "deploy" / "crontab.example").read_text(encoding="utf-8")
    assert "run_pg_backup.sh" in crontab
    assert "0 3 * * *" in crontab


def test_database_backup_doc_covers_restore_and_offsite():
    doc = (REPO_ROOT / "docs" / "DATABASE_BACKUP.md").read_text(encoding="utf-8")
    assert "pg_restore" in doc
    assert "OFFSITE_BACKUP_SCP_TARGET" in doc
    assert "setup_db_backup_cron.sh" in doc
    assert "setup_offsite_backup.sh" in doc
