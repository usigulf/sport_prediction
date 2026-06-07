"""In-play prediction helpers (v0)."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.prediction import Prediction
from app.services.live_prediction_service import (
    INPLAY_VERSION_MARKER,
    build_live_prediction_payload,
    is_in_play_prediction,
    tag_inplay_model_version,
)


def _game(**kwargs) -> Game:
    g = Game(
        id=uuid4(),
        league="nba",
        home_team_id=uuid4(),
        away_team_id=uuid4(),
        scheduled_time=datetime.now(timezone.utc) - timedelta(minutes=30),
        status="live",
        home_score=80,
        away_score=75,
    )
    for k, v in kwargs.items():
        setattr(g, k, v)
    return g


def _prediction(**kwargs) -> Prediction:
    p = Prediction(
        id=uuid4(),
        game_id=uuid4(),
        model_version=f"sklearn_simple_{INPLAY_VERSION_MARKER}",
        home_win_probability=0.62,
        away_win_probability=0.38,
        confidence_level="medium",
        created_at=datetime.now(timezone.utc),
    )
    for k, v in kwargs.items():
        setattr(p, k, v)
    return p


def test_tag_inplay_model_version_idempotent():
    assert tag_inplay_model_version("sklearn_simple") == f"sklearn_simple_{INPLAY_VERSION_MARKER}"
    tagged = f"sklearn_simple_{INPLAY_VERSION_MARKER}"
    assert tag_inplay_model_version(tagged) == tagged


def test_is_in_play_by_model_version():
    game = _game()
    pred = _prediction(model_version=f"heuristic_{INPLAY_VERSION_MARKER}")
    assert is_in_play_prediction(game, pred) is True


def test_is_in_play_by_post_kickoff_timestamp():
    kickoff = datetime.now(timezone.utc) - timedelta(hours=1)
    game = _game(scheduled_time=kickoff)
    pred = _prediction(
        model_version="sklearn_simple",
        created_at=datetime.now(timezone.utc),
    )
    assert is_in_play_prediction(game, pred) is True


def test_build_live_prediction_payload():
    game = _game()
    pred = _prediction()
    payload = build_live_prediction_payload(game, pred)
    assert payload["is_in_play"] is True
    assert payload["prediction_source"] == "score_adjusted_inplay_v0"
    assert payload["home_score"] == 80
    assert payload["game_status"] == "live"
