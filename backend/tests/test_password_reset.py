"""Tests for password reset endpoints (P3-002)."""
import re
from unittest.mock import patch

from fastapi import status

from app.models.password_reset_token import PasswordResetToken
from app.core.security import verify_password


def test_forgot_password_anti_enumeration(client):
    response = client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "nobody@example.com"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert "password reset" in response.json()["message"].lower()


def test_forgot_password_creates_token(client, test_user, db):
    captured: dict = {}

    def _capture(**kwargs):
        captured.update(kwargs)

    with patch(
        "app.services.password_reset_service.send_password_reset_email",
        side_effect=_capture,
    ):
        response = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_user.email},
        )

    assert response.status_code == status.HTTP_200_OK
    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == test_user.id)
        .first()
    )
    assert row is not None
    assert row.used_at is None
    assert "token=" in captured.get("reset_url", "")


def test_reset_password_and_login(client, test_user, db):
    captured: dict = {}

    with patch(
        "app.services.password_reset_service.send_password_reset_email",
        side_effect=lambda **kwargs: captured.update(kwargs),
    ):
        client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_user.email},
        )

    match = re.search(r"token=([^&]+)", captured["reset_url"])
    assert match
    raw_token = match.group(1)

    reset = client.post(
        "/api/v1/auth/reset-password",
        json={"token": raw_token, "password": "newpass99"},
    )
    assert reset.status_code == status.HTTP_200_OK
    assert "access_token" in reset.json()

    db.refresh(test_user)
    assert verify_password("newpass99", test_user.password_hash)

    login = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "newpass99"},
    )
    assert login.status_code == status.HTTP_200_OK

    row = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.user_id == test_user.id)
        .first()
    )
    assert row.used_at is not None


def test_reset_password_rejects_invalid_token(client):
    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "not-a-real-token", "password": "newpass99"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


def test_reset_password_rejects_weak_password(client, test_user):
    with patch("app.services.password_reset_service.send_password_reset_email"):
        client.post(
            "/api/v1/auth/forgot-password",
            json={"email": test_user.email},
        )

    response = client.post(
        "/api/v1/auth/reset-password",
        json={"token": "placeholder", "password": "short"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
