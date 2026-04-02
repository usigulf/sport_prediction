"""Batch prediction inference job (writes new Prediction rows, invalidates cache)."""
from app.services.prediction_inference_service import run_prediction_job
from app.services.prediction_service import PredictionService
from app.models.prediction import Prediction


def test_run_prediction_job_writes_row(db, test_game):
    r = run_prediction_job(db, game_ids=[str(test_game.id)], force=True)
    assert r.predictions_written == 1
    assert r.games_considered == 1
    pred = PredictionService(db).get_latest_prediction(str(test_game.id), use_cache=False)
    assert pred is not None
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
