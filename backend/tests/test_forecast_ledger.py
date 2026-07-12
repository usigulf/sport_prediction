"""Append-only forecast ledger tests."""
from datetime import datetime, timezone
from uuid import uuid4

from app.models.prediction import Prediction
from app.services.forecast_ledger_service import (
    append_forecast_ledger_entry,
    forecast_ledger_for_game,
    forecast_ledger_summary,
    verify_forecast_ledger_chain,
)


def _pred(game_id, *, home=0.58, away=0.42, version="sklearn_soccer_1x2"):
    return Prediction(
        id=uuid4(),
        game_id=game_id,
        model_version=version,
        prediction_type="pre_game",
        home_win_probability=home,
        away_win_probability=away,
        confidence_level="medium",
        created_at=datetime.now(timezone.utc),
    )


def test_append_and_verify_chain(db, test_game):
    p1 = _pred(test_game.id, home=0.60, away=0.40)
    db.add(p1)
    db.commit()
    e1 = append_forecast_ledger_entry(db, game=test_game, prediction=p1, feature_source="standings")
    assert e1.sequence == 1
    assert e1.prev_content_hash is None
    assert len(e1.content_hash) == 64

    p2 = _pred(test_game.id, home=0.55, away=0.45)
    db.add(p2)
    db.commit()
    e2 = append_forecast_ledger_entry(db, game=test_game, prediction=p2, feature_source="standings")
    assert e2.sequence == 2
    assert e2.prev_content_hash == e1.content_hash

    chain = verify_forecast_ledger_chain(db)
    assert chain["ok"] is True
    assert chain["checked"] == 2


def test_forecast_ledger_summary_and_game_endpoint(db, test_game, client):
    p = _pred(test_game.id)
    db.add(p)
    db.commit()
    append_forecast_ledger_entry(db, game=test_game, prediction=p)

    summary = forecast_ledger_summary(db)
    assert summary["total_entries"] == 1
    assert summary["chain_ok"] is True
    assert "sklearn" in summary["by_prediction_source"]

    per_game = forecast_ledger_for_game(db, test_game.id)
    assert per_game["entry_count"] == 1
    assert per_game["entries"][0]["prediction_source"] == "sklearn"

    r = client.get("/api/v1/stats/forecast-ledger")
    assert r.status_code == 200
    assert r.json()["total_entries"] >= 1

    r2 = client.get(f"/api/v1/games/{test_game.id}/forecast-ledger")
    assert r2.status_code == 200
    assert r2.json()["entry_count"] == 1


def test_protocol_doc_exists():
    from pathlib import Path

    root = Path(__file__).resolve().parents[2]
    assert (root / "docs" / "FORECAST_LEDGER.md").is_file()
