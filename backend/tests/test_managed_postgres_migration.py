"""P5-003: Managed Postgres migration plan and script."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_managed_postgres_migration_doc_exists():
    doc = REPO_ROOT / "docs" / "MANAGED_POSTGRES_MIGRATION.md"
    assert doc.is_file()
    text = doc.read_text(encoding="utf-8")
    assert "migrate_to_managed_postgres.sh" in text
    assert "sslmode=require" in text
    assert "alembic upgrade head" in text
    assert "Rollback" in text
    assert "pg_backup_docker.sh" in text


def test_migrate_script_exists_and_safe_guards():
    script = REPO_ROOT / "scripts" / "migrate_to_managed_postgres.sh"
    assert script.is_file()
    text = script.read_text(encoding="utf-8")
    assert "MANAGED_DATABASE_URL" in text
    assert "DRY_RUN" in text
    assert "pg_restore" in text
    assert "alembic upgrade head" in text
    assert "SKIP_BACKUP" in text
    assert "print_cutover" in text or "Cutover" in text


def test_production_env_example_documents_managed_url():
    env = (REPO_ROOT / ".env.production.example").read_text(encoding="utf-8")
    assert "DATABASE_URL=postgresql://" in env
    assert "MANAGED_POSTGRES" in env or "managed" in env.lower()
