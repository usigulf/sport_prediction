"""P5-001: Leaderboard uses SQL aggregation instead of full-table scans."""
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import status

from app.models.game import Game
from app.models.prediction import Prediction
from app.models.user import User
from app.models.user_prediction_view import UserPredictionView
from app.services.leaderboard_service import fetch_leaderboard

REPO_ROOT = Path(__file__).resolve().parents[2]


def _finished_game_with_prediction(db, test_teams, *, home_score: int, away_score: int, home_prob: float):
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now() - timedelta(days=2),
        status="finished",
        home_score=home_score,
        away_score=away_score,
    )
    db.add(game)
    db.flush()
    pred = Prediction(
        id=uuid4(),
        game_id=game.id,
        model_version="v1.0.0",
        home_win_probability=home_prob,
        away_win_probability=1.0 - home_prob,
        confidence_level="high",
    )
    db.add(pred)
    db.commit()
    db.refresh(game)
    db.refresh(pred)
    return game, pred


def test_leaderboard_ranks_by_sql_aggregated_accuracy(db, test_teams):
    accurate_user = User(
        id=uuid4(),
        email="accurate@example.com",
        password_hash="x",
        subscription_tier="premium_plus",
    )
    wrong_user = User(
        id=uuid4(),
        email="wrong@example.com",
        password_hash="x",
        subscription_tier="premium_plus",
    )
    db.add_all([accurate_user, wrong_user])
    db.commit()

    correct_game, correct_pred = _finished_game_with_prediction(
        db, test_teams, home_score=28, away_score=14, home_prob=0.7
    )
    wrong_game, wrong_pred = _finished_game_with_prediction(
        db, test_teams, home_score=10, away_score=24, home_prob=0.7
    )

    db.add_all(
        [
            UserPredictionView(user_id=accurate_user.id, game_id=correct_game.id, prediction_id=correct_pred.id),
            UserPredictionView(user_id=accurate_user.id, game_id=wrong_game.id, prediction_id=wrong_pred.id),
            UserPredictionView(user_id=wrong_user.id, game_id=correct_game.id, prediction_id=correct_pred.id),
        ]
    )
    db.commit()

    result = fetch_leaderboard(db, period="all", limit=10, current_user_id=accurate_user.id)
    assert result["count"] == 2
    assert result["eligible_users"] == 2
    assert result["entries"][0]["user_id"] == str(wrong_user.id)
    assert result["entries"][0]["correct"] == 1
    assert result["entries"][0]["total"] == 1
    assert result["entries"][0]["accuracy_pct"] == 100.0
    assert result["entries"][1]["user_id"] == str(accurate_user.id)
    assert result["entries"][1]["correct"] == 1
    assert result["entries"][1]["total"] == 2
    assert result["entries"][1]["accuracy_pct"] == 50.0
    assert result["entries"][1]["is_me"] is True


def test_leaderboard_dedupes_multiple_views_per_game(db, test_teams, test_user):
    game, pred = _finished_game_with_prediction(
        db, test_teams, home_score=21, away_score=17, home_prob=0.6
    )
    db.add_all(
        [
            UserPredictionView(user_id=test_user.id, game_id=game.id, prediction_id=pred.id),
            UserPredictionView(user_id=test_user.id, game_id=game.id, prediction_id=pred.id),
        ]
    )
    db.commit()

    result = fetch_leaderboard(db, period="all", limit=10)
    assert result["count"] == 1
    assert result["entries"][0]["total"] == 1
    assert result["entries"][0]["correct"] == 1


def test_leaderboard_weekly_filter_excludes_old_views(db, test_teams, test_user):
    game, pred = _finished_game_with_prediction(
        db, test_teams, home_score=30, away_score=20, home_prob=0.65
    )
    old_view = UserPredictionView(
        user_id=test_user.id,
        game_id=game.id,
        prediction_id=pred.id,
        viewed_at=datetime.now() - timedelta(days=10),
    )
    db.add(old_view)
    db.commit()

    weekly = fetch_leaderboard(db, period="weekly", limit=10)
    monthly = fetch_leaderboard(db, period="monthly", limit=10)
    assert weekly["count"] == 0
    assert monthly["count"] == 1


def test_leaderboard_api_uses_aggregated_service(client, pro_auth_headers, db, test_teams):
    user = db.query(User).filter(User.email == "pro@example.com").first()
    game, pred = _finished_game_with_prediction(
        db, test_teams, home_score=24, away_score=10, home_prob=0.8
    )
    db.add(UserPredictionView(user_id=user.id, game_id=game.id, prediction_id=pred.id))
    db.commit()

    response = client.get("/api/v1/leaderboards?period=all", headers=pro_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["count"] == 1
    assert body["entries"][0]["is_me"] is True
    assert body["entries"][0]["accuracy_pct"] == 100.0


def test_leaderboard_service_uses_sql_group_by():
    src = (REPO_ROOT / "backend" / "app" / "services" / "leaderboard_service.py").read_text(
        encoding="utf-8"
    )
    assert "group_by" in src
    assert "func.sum" in src
    assert "func.count" in src
    assert "finished_games" not in src
    assert "defaultdict" not in src


def test_leaderboard_api_delegates_to_service():
    api = (REPO_ROOT / "backend" / "app" / "api" / "v1" / "leaderboards.py").read_text(encoding="utf-8")
    assert "fetch_leaderboard" in api
    assert "finished_games" not in api
    assert "defaultdict" not in api
