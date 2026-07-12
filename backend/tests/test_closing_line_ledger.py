"""Closing-line ledger: freeze + model vs market acceptance."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.odds_snapshot import OddsSnapshot
from app.models.prediction import Prediction
from app.services.closing_line_ledger_service import (
    MARKET_BASELINE_MIN_SCORED,
    evaluate_model_vs_closing,
    freeze_closing_lines,
    mark_closing_snapshot,
)
from app.services.model_acceptance import evaluate_model_acceptance


def test_mark_closing_snapshot(db, test_game):
    kickoff = test_game.scheduled_time
    if kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)
    earlier = kickoff - timedelta(hours=2)
    snap = OddsSnapshot(
        id=uuid4(),
        game_id=test_game.id,
        captured_at=earlier,
        home_implied_prob=0.55,
        away_implied_prob=0.45,
        is_closing=False,
    )
    db.add(snap)
    db.commit()

    marked = mark_closing_snapshot(db, test_game)
    assert marked is not None
    assert marked.is_closing is True
    db.refresh(snap)
    assert snap.is_closing is True


def test_evaluate_model_beats_closing_market(db, test_teams, monkeypatch):
    monkeypatch.setenv("STRICT_LOW_TRUST_SUPPRESSION", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        kickoff = datetime.now(timezone.utc) - timedelta(days=1)
        game = Game(
            id=uuid4(),
            league="premier_league",
            home_team_id=test_teams[0].id,
            away_team_id=test_teams[1].id,
            scheduled_time=kickoff.replace(tzinfo=None),
            status="finished",
            home_score=2,
            away_score=0,
        )
        db.add(game)
        db.add(
            Prediction(
                id=uuid4(),
                game_id=game.id,
                model_version="sklearn_soccer_1x2",
                prediction_type="pre_game",
                home_win_probability=0.70,
                away_win_probability=0.15,
                confidence_level="high",
            )
        )
        db.add(
            OddsSnapshot(
                id=uuid4(),
                game_id=game.id,
                captured_at=kickoff - timedelta(minutes=5),
                home_implied_prob=0.40,
                away_implied_prob=0.35,
                is_closing=True,
            )
        )
        db.commit()

        # Pad to acceptance sample with synthetic finished games
        for i in range(MARKET_BASELINE_MIN_SCORED - 1):
            gid = uuid4()
            st = kickoff - timedelta(days=2 + i)
            g = Game(
                id=gid,
                league="premier_league",
                home_team_id=test_teams[0].id,
                away_team_id=test_teams[1].id,
                scheduled_time=st.replace(tzinfo=None),
                status="finished",
                home_score=1,
                away_score=0,
            )
            db.add(g)
            db.add(
                Prediction(
                    id=uuid4(),
                    game_id=gid,
                    model_version="sklearn_soccer_1x2",
                    prediction_type="pre_game",
                    home_win_probability=0.65,
                    away_win_probability=0.20,
                    confidence_level="medium",
                )
            )
            db.add(
                OddsSnapshot(
                    id=uuid4(),
                    game_id=gid,
                    captured_at=st - timedelta(minutes=10),
                    home_implied_prob=0.45,
                    away_implied_prob=0.30,
                    is_closing=True,
                )
            )
        db.commit()

        result = evaluate_model_vs_closing(db)
        assert result["scored_games"] >= MARKET_BASELINE_MIN_SCORED
        assert result["ledger_sample_met"] is True
        assert result["model_beats_or_ties_closing_market"] is True
        assert result["acceptance_ready"] is True
    finally:
        get_settings.cache_clear()


def test_public_charge_passes_with_market_eval(monkeypatch, tmp_path):
    import json
    from pathlib import Path

    soccer = tmp_path / "soccer"
    soccer.mkdir()
    (soccer / "simple_model.pkl").write_bytes(b"x")
    (soccer / "feature_columns.pkl").write_bytes(b"x")
    (soccer / "metrics.json").write_text(
        json.dumps(
            {
                "publish_ready": True,
                "league_group": "soccer",
                "model_kind": "soccer_1x2",
                "eval": {
                    "holdout_games": 120,
                    "log_loss": 1.05,
                    "baseline_log_loss": 1.0986,
                },
            }
        ),
        encoding="utf-8",
    )
    monkeypatch.setenv("EXPLANATION_MODEL_DIR", str(tmp_path))
    monkeypatch.setenv("ALLOW_HEURISTIC_INFERENCE", "false")
    monkeypatch.setenv("REQUIRE_PUBLISH_READY_MODEL", "true")
    from app.config import get_settings

    get_settings.cache_clear()
    try:
        result = evaluate_model_acceptance(
            "public_charge",
            calibration={"total_scored": 150, "min_sample_met": True},
            market_eval={
                "acceptance_ready": True,
                "scored_games": 80,
                "detail": "ok",
            },
        )
        assert result["passed"] is True
        assert "market_baseline_clv" not in result["failed_checks"]
    finally:
        get_settings.cache_clear()


def test_freeze_closing_lines_marks_window(db, test_game):
    now = datetime.now(timezone.utc)
    test_game.scheduled_time = (now + timedelta(minutes=10)).replace(tzinfo=None)
    test_game.status = "scheduled"
    db.add(
        OddsSnapshot(
            id=uuid4(),
            game_id=test_game.id,
            captured_at=now - timedelta(minutes=20),
            home_implied_prob=0.51,
            away_implied_prob=0.49,
            is_closing=False,
        )
    )
    db.commit()
    out = freeze_closing_lines(db, lookahead_minutes=30, after_kickoff_minutes=0, fetch_missing=False)
    assert out["closing_marked"] >= 1
    snap = (
        db.query(OddsSnapshot)
        .filter(OddsSnapshot.game_id == test_game.id, OddsSnapshot.is_closing.is_(True))
        .first()
    )
    assert snap is not None


def test_model_vs_closing_endpoint(client):
    r = client.get("/api/v1/stats/model-vs-closing")
    assert r.status_code == 200
    body = r.json()
    assert "scored_games" in body
    assert "acceptance_ready" in body
