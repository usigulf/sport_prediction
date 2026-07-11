"""Trial-ending reminder email."""
from datetime import datetime, timedelta, timezone
from unittest.mock import patch

from app.core.security import get_password_hash
from app.models.user import User
from app.models.user_push_token import UserPushToken
from app.services.push_trigger_service import send_trial_ending_reminders


@patch("app.services.push_trigger_service.send_trial_ending_email", return_value=True)
@patch("app.services.push_trigger_service.send_expo_push")
def test_trial_ending_sends_push_and_email(mock_push, mock_email, db):
    user = User(
        email="trial@example.com",
        password_hash=get_password_hash("trial123"),
        subscription_tier="premium",
        subscription_trial_end_at=datetime.now(timezone.utc) + timedelta(hours=12),
    )
    db.add(user)
    db.commit()
    db.add(UserPushToken(user_id=user.id, token="ExponentPushToken[test]", platform="ios"))
    db.commit()

    sent = send_trial_ending_reminders(db)

    assert sent == 1
    mock_push.assert_called_once()
    mock_email.assert_called_once_with(to_email="trial@example.com")
    db.refresh(user)
    assert user.trial_ending_push_sent_at is not None


@patch("app.services.push_trigger_service.send_trial_ending_email", return_value=True)
@patch("app.services.push_trigger_service.send_expo_push")
def test_trial_ending_email_only_when_no_push_token(mock_push, mock_email, db):
    user = User(
        email="emailonly@example.com",
        password_hash=get_password_hash("trial123"),
        subscription_tier="premium",
        subscription_trial_end_at=datetime.now(timezone.utc) + timedelta(hours=12),
    )
    db.add(user)
    db.commit()

    sent = send_trial_ending_reminders(db)

    assert sent == 1
    mock_push.assert_not_called()
    mock_email.assert_called_once_with(to_email="emailonly@example.com")
