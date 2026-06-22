"""Guest browse: teaser pick caps and public game list behavior."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.prediction import Prediction
from app.services.guest_access_service import cap_guest_teaser_picks


def _schedule_game(db, test_teams, *, offset_hours: int = 0):
    g = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime(2031, 4, 1, 18, 0, tzinfo=timezone.utc) + timedelta(hours=offset_hours),
        status="scheduled",
    )
    db.add(g)
    db.flush()
    db.add(
        Prediction(
            id=uuid4(),
            game_id=g.id,
            model_version="v1",
            home_win_probability=0.6,
            away_win_probability=0.4,
            confidence_level="high",
        )
    )
    return g


def test_cap_guest_teaser_picks_limits_predictions():
    picks = [
        {"id": "1", "prediction": {"home_win_probability": 0.6}},
        {"id": "2", "prediction": {"home_win_probability": 0.7}},
        {"id": "3", "prediction": {"home_win_probability": 0.8}},
        {"id": "4", "prediction": {"home_win_probability": 0.55}},
    ]
    capped = cap_guest_teaser_picks(picks, limit=3)
    assert capped[0]["prediction"] is not None
    assert capped[2]["prediction"] is not None
    assert capped[3]["prediction"] is None
    assert capped[3]["guest_locked"] is True


def test_top_picks_guest_caps_at_three_predictions(client, db, test_teams, monkeypatch):
    monkeypatch.setenv("GUEST_TEASER_PICK_LIMIT", "3")
    from app.config import get_settings

    get_settings.cache_clear()
    for i in range(5):
        _schedule_game(db, test_teams, offset_hours=i)
    db.commit()

    r = client.get(
        "/api/v1/feed/top-picks",
        params={"date": "2031-04-01", "time_zone": "UTC", "limit": 10},
    )
    assert r.status_code == 200
    picks = r.json()["picks"]
    with_pred = [p for p in picks if p.get("prediction")]
    locked = [p for p in picks if p.get("guest_locked")]
    assert len(with_pred) <= 3
    assert len(locked) >= 1
    get_settings.cache_clear()


def test_upcoming_guest_has_no_predictions(client, db, test_game, test_prediction):
    r = client.get("/api/v1/games/upcoming", params={"limit": 20})
    assert r.status_code == 200
    games = r.json()["games"]
    assert games
    assert all(g.get("prediction") is None for g in games)


def test_get_game_guest_requires_signup(client, db, test_game, test_prediction):
    r = client.get(f"/api/v1/games/{test_game.id}")
    assert r.status_code == 200
    body = r.json()
    assert body.get("prediction") is None
    assert body.get("guest_signup_required") is True
