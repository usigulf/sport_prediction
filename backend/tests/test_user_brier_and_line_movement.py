"""Tests for user Brier tracking (I92), odds snapshots, line movement (I62), CLV (I63)."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import status

from app.models.game import Game
from app.models.odds_snapshot import OddsSnapshot
from app.models.prediction import Prediction
from app.models.user_pick import UserPick
from app.services.odds_snapshot_service import (
    build_line_movement_series,
    compute_clv_for_pick,
    maybe_record_odds_snapshot,
)
from app.services.user_brier_service import build_user_brier_summary, record_user_pick


def test_record_user_pick_and_brier_beats_model(db, test_user, test_teams):
    game_id = uuid4()
    scheduled = datetime.now(timezone.utc) - timedelta(days=2)
    game = Game(
        id=game_id,
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=scheduled,
        status="scheduled",
    )
    db.add(game)
    db.add(
        Prediction(
            id=uuid4(),
            game_id=game_id,
            model_version="v1.0.0",
            prediction_type="pre_game",
            home_win_probability=0.55,
            away_win_probability=0.45,
            confidence_level="medium",
        )
    )
    db.commit()

    record_user_pick(
        db,
        user_id=test_user.id,
        game=game,
        outcome="home",
        probability=0.90,
        market_home_implied=0.52,
        market_away_implied=0.48,
    )
    game.status = "finished"
    game.home_score = 28
    game.away_score = 14
    db.commit()

    summary = build_user_brier_summary(db, test_user.id)
    assert summary["scored_picks"] == 1
    assert summary["user_brier"] == 0.01  # (0.9 - 1)^2
    assert summary["model_brier"] == 0.2025  # (0.55 - 1)^2
    assert summary["brier_delta"] < 0  # user better than model on this pick


def test_submit_pick_endpoint(client, auth_headers, test_game):
    r = client.post(
        "/api/v1/user/me/picks",
        headers=auth_headers,
        json={
            "game_id": str(test_game.id),
            "outcome": "home",
            "probability": 0.62,
            "market_home_implied_prob": 0.55,
            "market_away_implied_prob": 0.45,
        },
    )
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["outcome"] == "home"
    assert body["probability"] == 0.62


def test_brier_endpoint_requires_auth(client):
    r = client.get("/api/v1/user/me/picks/brier")
    assert r.status_code == status.HTTP_401_UNAUTHORIZED


def test_odds_snapshot_dedupes_rapid_fetches(db, test_game):
    payload = {
        "available": True,
        "provider": "test",
        "consensus": {
            "home_implied_prob": 0.55,
            "away_implied_prob": 0.45,
            "spread_home": -3.0,
        },
    }
    first = maybe_record_odds_snapshot(db, test_game, payload)
    second = maybe_record_odds_snapshot(db, test_game, payload)
    assert first is not None
    assert second is None
    count = db.query(OddsSnapshot).filter(OddsSnapshot.game_id == test_game.id).count()
    assert count == 1


def test_line_movement_endpoint(client, db, test_game):
    snap = OddsSnapshot(
        game_id=test_game.id,
        captured_at=datetime.now(timezone.utc),
        provider="test",
        home_implied_prob=0.56,
        away_implied_prob=0.44,
        spread_home=-2.5,
    )
    db.add(snap)
    db.commit()
    r = client.get(f"/api/v1/games/{test_game.id}/line-movement")
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["point_count"] == 1
    assert body["points"][0]["home_implied_prob"] == 0.56


def test_clv_positive_when_line_moves_toward_pick(db, test_teams):
    kickoff = datetime.now(timezone.utc) - timedelta(hours=1)
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=kickoff,
        status="finished",
        home_score=21,
        away_score=17,
    )
    db.add(game)
    db.add(
        OddsSnapshot(
            game_id=game.id,
            captured_at=kickoff - timedelta(hours=6),
            home_implied_prob=0.50,
            away_implied_prob=0.50,
        )
    )
    db.add(
        OddsSnapshot(
            game_id=game.id,
            captured_at=kickoff - timedelta(minutes=30),
            home_implied_prob=0.58,
            away_implied_prob=0.42,
        )
    )
    db.commit()
    clv = compute_clv_for_pick(
        db,
        game=game,
        outcome="home",
        pick_home_implied=0.50,
        pick_away_implied=0.50,
    )
    assert clv is not None
    assert clv["clv"] == 0.08


def test_line_movement_series(db, test_game):
    db.add_all(
        [
            OddsSnapshot(
                game_id=test_game.id,
                captured_at=datetime.now(timezone.utc) - timedelta(hours=2),
                home_implied_prob=0.52,
                away_implied_prob=0.48,
            ),
            OddsSnapshot(
                game_id=test_game.id,
                captured_at=datetime.now(timezone.utc) - timedelta(hours=1),
                home_implied_prob=0.55,
                away_implied_prob=0.45,
            ),
        ]
    )
    db.commit()
    series = build_line_movement_series(db, test_game)
    assert series["point_count"] == 2
