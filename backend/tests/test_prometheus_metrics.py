"""PH2-010: Prometheus /metrics endpoint and monitoring stack."""
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_prometheus_metrics_module_exists():
    path = REPO_ROOT / "backend" / "app" / "monitoring" / "prometheus_metrics.py"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "http_requests_total" in text
    assert "normalize_path" in text
    assert "provider_sync_total" in text
    assert "data_freshness_hours" in text
    assert "PROVIDER_SYNC_TOTAL" in text
    assert "DATA_FRESHNESS_HOURS" in text


def test_main_wires_prometheus_metrics():
    main = (REPO_ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
    assert "setup_prometheus_metrics" in main


def test_metrics_endpoint_returns_prometheus_text(client):
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "text/plain" in r.headers.get("content-type", "")
    body = r.text
    assert "http_requests_total" in body


def test_metrics_endpoint_records_health_request(client):
    client.get("/health")
    r = client.get("/metrics")
    assert r.status_code == 200
    assert "/health" in r.text or "health" in r.text


def test_prometheus_yml_scrapes_api():
    yml = (REPO_ROOT / "monitoring" / "prometheus" / "prometheus.yml").read_text(encoding="utf-8")
    assert "sport-prediction-api" in yml
    assert "api:8000" in yml
    assert "/metrics" in yml


def test_nginx_snippet_denies_public_metrics():
    snippet = (REPO_ROOT / "deploy" / "nginx-deny-internal-snippet.conf").read_text(encoding="utf-8")
    assert "location = /metrics" in snippet


def test_setup_prometheus_script_exists():
    path = REPO_ROOT / "scripts" / "setup_prometheus_monitoring.sh"
    assert path.is_file()


def test_prometheus_client_in_requirements_in():
    req_in = (REPO_ROOT / "backend" / "requirements.in").read_text(encoding="utf-8")
    assert "prometheus-client" in req_in
