"""Tests for model-vs-market dashboard (I64)."""
from unittest.mock import patch

from app.services.model_vs_market_service import build_model_vs_market_summary


def test_model_vs_market_summary_structure(db, test_game, test_prediction):
    with patch(
        "app.services.model_vs_market_service.get_market_odds_for_game",
        return_value={"available": False},
    ):
        summary = build_model_vs_market_summary(db, upcoming_limit=5)
    assert "model_accuracy_all_time" in summary
    assert "upcoming_edges" in summary
    assert summary["disclaimer"]


def test_model_vs_market_includes_edge_when_odds_available(db, test_game, test_prediction):
    mock_odds = {
        "available": True,
        "model_comparison": {
            "model_home_win_prob": 0.58,
            "market_home_implied_prob": 0.52,
            "home_edge_pct": 6.0,
            "edge_label": "model_leans_home",
        },
    }
    with patch(
        "app.services.model_vs_market_service.get_market_odds_for_game",
        return_value=mock_odds,
    ):
        summary = build_model_vs_market_summary(db, upcoming_limit=5)
    assert summary["upcoming_with_odds"] >= 1
    assert len(summary["upcoming_edges"]) >= 1


def test_walk_forward_includes_market_benchmark_note(db):
    from app.services.walk_forward_backtest import run_walk_forward_backtest

    report = run_walk_forward_backtest(db, groups=["nfl"], min_train_games=1, test_window_games=1)
    assert "market_benchmark" in report
    assert report["market_benchmark"]["status"] == "not_available"


def test_model_vs_market_endpoint(client):
    r = client.get("/api/v1/stats/model-vs-market")
    assert r.status_code == 200
    data = r.json()
    assert "model_accuracy_all_time" in data
    assert "upcoming_edges" in data
