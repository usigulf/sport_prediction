"""Kickoff and high-confidence push triggers for favorite teams/leagues."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch
from uuid import uuid4

import pytest

from app.models.game import Game
from app.models.push_reminder_sent import PushReminderSent
from app.models.user_favorite import UserFavorite
from app.models.user_push_token import UserPushToken
from app.services.push_trigger_service import (
    REMINDER_GAME_STARTING,
    REMINDER_HIGH_CONFIDENCE,
    send_game_starting_reminders,
    send_high_confidence_picks,
)


def _add_favorite(db, user_id, entity_type: str, entity_id: str) -> None:
    db.add(UserFavorite(user_id=user_id, entity_type=entity_type, entity_id=entity_id))
    db.commit()


def _add_push_token(db, user_id, token: str = "ExponentPushToken[test]") -> None:
    db.add(UserPushToken(user_id=user_id, token=token))
    db.commit()


@patch("app.services.push_trigger_service.send_expo_push")
def test_kickoff_reminder_for_favorite_team(mock_send, db, test_user, test_teams):
    now = datetime(2031, 6, 1, 12, 0, tzinfo=timezone.utc)
    kickoff = now + timedelta(hours=2)
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=kickoff.replace(tzinfo=None),
        status="scheduled",
    )
    db.add(game)
    db.commit()

    _add_favorite(db, test_user.id, "team", str(test_teams[0].id))
    _add_push_token(db, test_user.id)

    with patch("app.services.push_trigger_service._utc_now", return_value=now):
        sent = send_game_starting_reminders(db)

    assert sent == 1
    mock_send.assert_called_once()
    _args, kwargs = mock_send.call_args
    body = _args[2]
    assert kwargs["data"]["game_id"] == str(game.id)
    assert kwargs["data"]["type"] == "game_reminder"
    assert "Your team Team A plays in about 2 hours" in body
    assert db.query(PushReminderSent).filter(
        PushReminderSent.user_id == test_user.id,
        PushReminderSent.game_id == game.id,
        PushReminderSent.reminder_type == REMINDER_GAME_STARTING,
    ).count() == 1


@patch("app.services.push_trigger_service.send_expo_push")
def test_kickoff_reminder_skips_outside_window(mock_send, db, test_user, test_teams):
    now = datetime(2031, 6, 1, 12, 0, tzinfo=timezone.utc)
    kickoff = now + timedelta(hours=1)  # too soon for 2h window
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=kickoff.replace(tzinfo=None),
        status="scheduled",
    )
    db.add(game)
    db.commit()
    _add_favorite(db, test_user.id, "team", str(test_teams[0].id))
    _add_push_token(db, test_user.id)

    with patch("app.services.push_trigger_service._utc_now", return_value=now):
        sent = send_game_starting_reminders(db)

    assert sent == 0
    mock_send.assert_not_called()


@patch("app.services.push_trigger_service.send_expo_push")
def test_kickoff_reminder_for_favorite_league(mock_send, db, test_user, test_teams):
    now = datetime(2031, 6, 1, 12, 0, tzinfo=timezone.utc)
    kickoff = now + timedelta(hours=2)
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=kickoff.replace(tzinfo=None),
        status="scheduled",
    )
    db.add(game)
    db.commit()
    _add_favorite(db, test_user.id, "league", "nfl")
    _add_push_token(db, test_user.id)

    with patch("app.services.push_trigger_service._utc_now", return_value=now):
        sent = send_game_starting_reminders(db)

    assert sent == 1
    assert "kicks off in about 2 hours" in mock_send.call_args[0][2]


@patch("app.services.push_trigger_service.send_expo_push")
def test_kickoff_reminder_deduped(mock_send, db, test_user, test_teams):
    now = datetime(2031, 6, 1, 12, 0, tzinfo=timezone.utc)
    kickoff = now + timedelta(hours=2)
    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=kickoff.replace(tzinfo=None),
        status="scheduled",
    )
    db.add(game)
    db.commit()
    _add_favorite(db, test_user.id, "team", str(test_teams[0].id))
    _add_push_token(db, test_user.id)
    db.add(PushReminderSent(
        user_id=test_user.id,
        game_id=game.id,
        reminder_type=REMINDER_GAME_STARTING,
    ))
    db.commit()

    with patch("app.services.push_trigger_service._utc_now", return_value=now):
        sent = send_game_starting_reminders(db)

    assert sent == 0
    mock_send.assert_not_called()


@patch("app.services.push_trigger_service.send_expo_push")
def test_high_confidence_pick_for_favorite_team(mock_send, db, test_user, test_teams, test_prediction):
    _add_favorite(db, test_user.id, "team", str(test_teams[0].id))
    _add_push_token(db, test_user.id)

    sent = send_high_confidence_picks(db)

    assert sent == 1
    mock_send.assert_called_once()
    assert mock_send.call_args.kwargs["data"]["type"] == "high_confidence"
    assert db.query(PushReminderSent).filter(
        PushReminderSent.reminder_type == REMINDER_HIGH_CONFIDENCE,
    ).count() == 1
