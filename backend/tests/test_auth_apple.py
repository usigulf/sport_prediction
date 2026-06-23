"""
Tests for Sign in with Apple auth endpoint
"""
from unittest.mock import patch

from fastapi import status

from app.models.user import User
from app.core.security import get_password_hash
from app.services.apple_auth_service import AppleAuthError


APPLE_CLAIMS = {
    "sub": "apple-user-001",
    "email": "appleuser@privaterelay.appleid.com",
    "iss": "https://appleid.apple.com",
    "aud": "com.sportsprediction.app",
}


@patch("app.api.v1.auth.verify_apple_identity_token", return_value=APPLE_CLAIMS)
def test_apple_sign_in_creates_user(mock_verify, client, db):
    response = client.post(
        "/api/v1/auth/apple",
        json={"identity_token": "fake.jwt.token"},
    )
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    user = db.query(User).filter(User.apple_sub == "apple-user-001").first()
    assert user is not None
    assert user.email == "appleuser@privaterelay.appleid.com"
    mock_verify.assert_called_once()


@patch("app.api.v1.auth.verify_apple_identity_token", return_value=APPLE_CLAIMS)
def test_apple_sign_in_existing_apple_sub(mock_verify, client, db):
    user = User(
        email="appleuser@privaterelay.appleid.com",
        password_hash=get_password_hash("unused"),
        apple_sub="apple-user-001",
        subscription_tier="free",
    )
    db.add(user)
    db.commit()

    response = client.post(
        "/api/v1/auth/apple",
        json={"identity_token": "fake.jwt.token"},
    )
    assert response.status_code == status.HTTP_200_OK
    assert db.query(User).filter(User.apple_sub == "apple-user-001").count() == 1


@patch("app.api.v1.auth.verify_apple_identity_token", return_value=APPLE_CLAIMS)
def test_apple_sign_in_links_existing_email_account(mock_verify, client, test_user, db):
    response = client.post(
        "/api/v1/auth/apple",
        json={"identity_token": "fake.jwt.token", "email": test_user.email},
    )
    assert response.status_code == status.HTTP_200_OK
    db.refresh(test_user)
    assert test_user.apple_sub == "apple-user-001"


@patch(
    "app.api.v1.auth.verify_apple_identity_token",
    side_effect=AppleAuthError("bad token"),
)
def test_apple_sign_in_invalid_token(mock_verify, client):
    response = client.post(
        "/api/v1/auth/apple",
        json={"identity_token": "invalid"},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@patch("app.api.v1.auth.verify_apple_identity_token", return_value={"sub": "only-sub"})
def test_apple_sign_in_missing_email(mock_verify, client):
    response = client.post(
        "/api/v1/auth/apple",
        json={"identity_token": "fake.jwt.token"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
