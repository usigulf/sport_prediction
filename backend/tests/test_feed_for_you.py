"""Feed for-you: personalization by favorite teams and leagues."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import status

from app.models.game import Game
from app.models.prediction import Prediction
from app.models.team import Team
from app.models.user_favorite import UserFavorite


def _add_prediction(db, game_id, confidence_level: str):
    pred = Prediction(
        id=uuid4(),
        game_id=game_id,
        model_version="v1.0.0",
        home_win_probability=0.6,
        away_win_probability=0.4,
        expected_home_score=2.0,
        expected_away_score=1.0,
        confidence_level=confidence_level,
    )
    db.add(pred)
    db.commit()
    return pred


def test_for_you_prioritizes_favorite_team(client, db, test_teams, test_user, auth_headers):
    third_team = Team(
        id=uuid4(),
        name="Team C",
        league="nfl",
        abbreviation="DAL",
    )
    db.add(third_team)
    db.commit()

    kickoff = datetime(2031, 3, 10, 18, 0, tzinfo=timezone.utc)
    favorite_game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=kickoff,
        status="scheduled",
    )
    other_game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[1].id,
        away_team_id=third_team.id,
        scheduled_time=kickoff + timedelta(hours=1),
        status="scheduled",
    )
    db.add_all([favorite_game, other_game])
    db.commit()

    _add_prediction(db, favorite_game.id, "medium")
    _add_prediction(db, other_game.id, "high")

    db.add(
        UserFavorite(
            id=uuid4(),
            user_id=test_user.id,
            entity_type="team",
            entity_id=str(test_teams[0].id),
        )
    )
    db.commit()

    r = client.get(
        "/api/v1/feed/for-you",
        headers=auth_headers,
        params={"date": "2031-03-10", "time_zone": "UTC", "limit": 5},
    )
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["personalized"] is True
    assert body["picks"][0]["id"] == str(favorite_game.id)


def test_for_you_guest_not_personalized(client, db, test_teams, test_game, test_prediction):
    test_game.scheduled_time = datetime(2031, 3, 10, 20, 0, tzinfo=timezone.utc)
    db.commit()

    r = client.get(
        "/api/v1/feed/for-you",
        params={"date": "2031-03-10", "time_zone": "UTC", "limit": 10},
    )
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["personalized"] is False
    ids = [p["id"] for p in body["picks"]]
    assert str(test_game.id) in ids
