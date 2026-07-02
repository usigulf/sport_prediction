"""Batch prediction inference job (writes new Prediction rows, invalidates cache)."""
from app.config import get_settings
from app.constants.predictions import PREDICTION_TYPE_PRE_GAME
from app.services.model_training import artifacts_publish_ready, train_and_save
from app.services.prediction_inference_service import _model_dir, run_prediction_job
from app.services.prediction_service import PredictionService
from app.models.prediction import Prediction
from tests.test_model_training import _seed_separable_nfl_history


def test_run_prediction_job_writes_row(db, test_game):
    r = run_prediction_job(db, game_ids=[str(test_game.id)], force=True)
    assert r.predictions_written == 1
    assert r.games_considered == 1
    pred = PredictionService(db).get_latest_prediction(str(test_game.id), use_cache=False)
    assert pred is not None
    assert pred.prediction_type == PREDICTION_TYPE_PRE_GAME
    assert 0 < float(pred.home_win_probability) < 1
    assert pred.rich_analysis and pred.rich_analysis.get("real_time_analysis")
    assert pred.rich_analysis.get("form_standings")


def test_run_prediction_job_respects_cooldown(db, test_game):
    run_prediction_job(db, game_ids=[str(test_game.id)], force=True)
    r2 = run_prediction_job(
        db,
        game_ids=[str(test_game.id)],
        force=False,
        min_minutes_scheduled=9999,
        min_minutes_live=9999,
    )
    assert r2.skipped_cooldown == 1
    assert r2.predictions_written == 0


def test_run_prediction_job_force_second_write(db, test_game):
    run_prediction_job(db, game_ids=[str(test_game.id)], force=True)
    n_before = db.query(Prediction).filter(Prediction.game_id == test_game.id).count()
    run_prediction_job(db, game_ids=[str(test_game.id)], force=True)
    n_after = db.query(Prediction).filter(Prediction.game_id == test_game.id).count()
    assert n_after == n_before + 1


def test_finished_backfill_writes_pregame_for_calibration(db, test_teams):
    from datetime import datetime, timedelta, timezone
    from uuid import uuid4

    from app.models.game import Game
    from app.services.trust_metrics_service import aggregate_calibration_from_finished

    home, away = test_teams
    game = Game(
        id=uuid4(),
        league="nba",
        home_team_id=home.id,
        away_team_id=away.id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=3),
        status="finished",
        home_score=110,
        away_score=102,
    )
    db.add(game)
    db.commit()

    before = aggregate_calibration_from_finished(db)["total_scored"]
    r = run_prediction_job(
        db,
        game_ids=[str(game.id)],
        force=True,
        include_recent_finished_days=0,
    )
    assert r.predictions_written == 1
    pred = db.query(Prediction).filter(Prediction.game_id == game.id).one()
    assert pred.prediction_type == PREDICTION_TYPE_PRE_GAME
    kickoff = game.scheduled_time
    if kickoff.tzinfo is None:
        kickoff = kickoff.replace(tzinfo=timezone.utc)
    created = pred.created_at
    if created.tzinfo is None:
        created = created.replace(tzinfo=timezone.utc)
    assert created < kickoff
    after = aggregate_calibration_from_finished(db)["total_scored"]
    assert after == before + 1


def test_inference_ignores_unpublished_artifacts(db, tmp_path, monkeypatch, test_game):
    _seed_separable_nfl_history(db, n_games=60)
    out_dir = str(tmp_path / "models")
    train_and_save(
        db,
        out_dir,
        test_frac=0.2,
        min_games=10,
        min_publish_holdout_per_league_group=500,
        force=True,
    )
    assert artifacts_publish_ready(out_dir) is False

    monkeypatch.setenv("MODEL_ARTIFACT_DIR", out_dir)
    get_settings.cache_clear()
    assert _model_dir() is None

    r = run_prediction_job(db, game_ids=[str(test_game.id)], force=True)
    assert r.predictions_written == 1
    pred = PredictionService(db).get_latest_prediction(str(test_game.id), use_cache=False)
    assert pred is not None
    assert "sklearn" not in (pred.model_version or "").lower()
