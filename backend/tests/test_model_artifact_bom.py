"""Model artifact BOM + fail-closed health (external audit #3)."""
from pathlib import Path

from app.services.model_artifact_bom import build_model_artifact_bom


def test_bom_reports_missing_dir(monkeypatch, tmp_path):
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(tmp_path / "missing"))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "true")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "false")
    from app.config import get_settings

    get_settings.cache_clear()
    bom = build_model_artifact_bom()
    assert bom["publish_ready"] is False
    assert bom["inference_mode"] == "heuristic"
    assert bom["healthy_for_launch"] is True
    get_settings.cache_clear()


def test_bom_fail_closed_when_required(monkeypatch, tmp_path):
    empty = tmp_path / "empty"
    empty.mkdir()
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(empty))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "false")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    bom = build_model_artifact_bom()
    assert bom["publish_ready"] is False
    assert bom["inference_mode"] == "blocked"
    assert bom["healthy_for_launch"] is False
    get_settings.cache_clear()


def test_health_includes_model_block(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "healthy"
    assert "model" in body
    assert "inference_mode" in body["model"]


def test_stats_model_includes_inference_mode(client):
    r = client.get("/api/v1/stats/model")
    assert r.status_code == 200
    body = r.json()
    assert "inference_mode" in body
    assert "healthy_for_launch" in body


def test_model_artifact_bom_doc_exists():
    root = Path(__file__).resolve().parents[2]
    assert (root / "docs" / "MODEL_ARTIFACT_BOM.md").is_file()


def test_heuristic_blocked_raises(monkeypatch, tmp_path):
    empty = tmp_path / "empty"
    empty.mkdir()
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(empty))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "false")
    from app.config import get_settings
    from app.services.prediction_inference_service import _predict_for_game
    from app.models.game import Game
    from datetime import datetime, timezone
    from uuid import uuid4
    from unittest.mock import MagicMock

    get_settings.cache_clear()
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=uuid4(),
        away_team_id=uuid4(),
        scheduled_time=datetime.now(timezone.utc),
        status="scheduled",
    )
    db = MagicMock()
    # Force feature builder path via monkeypatch on build_game_features
    import app.services.prediction_inference_service as pis

    monkeypatch.setattr(
        pis,
        "build_game_features",
        lambda g, d: (
            {
                "home_team_win_rate": 0.5,
                "away_team_win_rate": 0.5,
                "home_team_avg_score": 20,
                "away_team_avg_score": 20,
                "home_team_recent_form": 0.5,
                "away_team_recent_form": 0.5,
                "home_advantage": 1.0,
                "rest_days_home": 7,
                "rest_days_away": 7,
            },
            "synthetic",
        ),
    )
    monkeypatch.setattr(pis, "_model_dir", lambda: None)
    try:
        raised = False
        try:
            _predict_for_game(game, db)
        except RuntimeError as e:
            raised = True
            assert "ALLOW_HEURISTIC_INFERENCE" in str(e)
        assert raised
    finally:
        get_settings.cache_clear()
