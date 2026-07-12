"""Soccer-wedge model acceptance protocol tests."""
import json
from pathlib import Path

from app.services.model_acceptance import evaluate_model_acceptance


def _write_soccer_ready(tmp_path: Path, *, log_loss: float = 1.05, holdout: int = 80) -> Path:
    soccer = tmp_path / "soccer"
    soccer.mkdir(parents=True)
    (soccer / "simple_model.pkl").write_bytes(b"fake")
    (soccer / "feature_columns.pkl").write_bytes(b"fake")
    metrics = {
        "status": "ready",
        "league_group": "soccer",
        "model_kind": "soccer_1x2",
        "model_version": "sklearn_soccer_1x2",
        "publish_ready": True,
        "games": 600,
        "eval": {
            "holdout_games": holdout,
            "test_games": holdout,
            "split": "chronological_tail",
            "log_loss": log_loss,
            "baseline_log_loss": 1.0986,
            "beats_uniform_baseline": log_loss < 1.0986,
            "accuracy": 0.45,
        },
    }
    (soccer / "metrics.json").write_text(json.dumps(metrics), encoding="utf-8")
    return tmp_path


def test_engineering_beta_passes_with_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(tmp_path))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "true")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        result = evaluate_model_acceptance("engineering_beta")
        assert result["passed"] is True
        assert result["wedge"] == "soccer"
    finally:
        get_settings.cache_clear()


def test_invite_beta_requires_fail_closed_and_soccer(monkeypatch, tmp_path):
    root = _write_soccer_ready(tmp_path)
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(root))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "true")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        result = evaluate_model_acceptance("invite_beta")
        assert result["passed"] is False
        assert "fail_closed_heuristics" in result["failed_checks"]
    finally:
        get_settings.cache_clear()

    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "false")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "true")
    get_settings.cache_clear()
    try:
        result = evaluate_model_acceptance("invite_beta")
        assert result["passed"] is True
        assert result["soccer_metrics"]["publish_ready"] is True
    finally:
        get_settings.cache_clear()


def test_invite_beta_fails_when_worse_than_baseline(monkeypatch, tmp_path):
    root = _write_soccer_ready(tmp_path, log_loss=1.2, holdout=80)
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(root))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "false")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        result = evaluate_model_acceptance("invite_beta")
        assert result["passed"] is False
        assert "beats_naive_baseline" in result["failed_checks"]
    finally:
        get_settings.cache_clear()


def test_public_charge_blocked_without_market_ledger(monkeypatch, tmp_path):
    root = _write_soccer_ready(tmp_path, log_loss=1.05, holdout=120)
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(root))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "false")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        result = evaluate_model_acceptance(
            "public_charge",
            calibration={"total_scored": 150, "min_sample_met": True},
            market_eval=None,
        )
        assert result["passed"] is False
        assert "market_baseline_clv" in result["failed_checks"]
        assert result["market_baseline"]["status"] == "missing_eval"
    finally:
        get_settings.cache_clear()


def test_model_acceptance_endpoint(client):
    r = client.get("/api/v1/stats/model-acceptance?level=engineering_beta")
    assert r.status_code == 200
    body = r.json()
    assert body["level"] == "engineering_beta"
    assert "checks" in body


def test_protocol_doc_exists():
    root = Path(__file__).resolve().parents[2]
    assert (root / "docs" / "MODEL_ACCEPTANCE_PROTOCOL.md").is_file()
