"""PH2-009: Staging environment scripts and compose overlay."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_staging_compose_overlay_exists():
    path = REPO_ROOT / "docker-compose.staging.yml"
    text = path.read_text(encoding="utf-8")
    assert "api-staging" in text
    assert "sportsprediction_staging" in text
    assert "8001:8000" in text


def test_staging_deploy_scripts_exist():
    for name in (
        "deploy_staging_api.sh",
        "setup_staging_env.sh",
        "ensure_staging_database.sh",
        "check_staging_health.sh",
    ):
        path = REPO_ROOT / "scripts" / name
        assert path.is_file(), f"missing {path}"


def test_staging_env_example_and_docs():
    example = (REPO_ROOT / ".env.staging.example").read_text(encoding="utf-8")
    doc = (REPO_ROOT / "docs" / "STAGING_ENVIRONMENT.md").read_text(encoding="utf-8")
    assert "ENVIRONMENT=staging" in example
    assert "api-staging.octobetiq.com" in doc
    assert "deploy_staging_api.sh" in doc


def test_staging_nginx_example():
    nginx = (REPO_ROOT / "deploy" / "nginx-octobetiq-staging-api.conf.example").read_text(
        encoding="utf-8"
    )
    assert "api-staging.octobetiq.com" in nginx
    assert "127.0.0.1:8001" in nginx


def test_health_includes_environment(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert "environment" in body


def test_eas_staging_profile_points_at_staging_api():
    eas = (REPO_ROOT / "mobile" / "eas.json").read_text(encoding="utf-8")
    assert '"staging"' in eas
    assert "api-staging.octobetiq.com" in eas
