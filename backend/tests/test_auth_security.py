"""
Additional auth security tests
"""
import pytest
from fastapi import status


def test_register_weak_password(client):
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "password": "short"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_refresh_rejects_access_token(client, test_user):
    login = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "testpass123"},
    )
    access = login.json()["access_token"]
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access},
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_logout_does_not_revoke_another_users_refresh_token(client, test_user, premium_user):
    """P0: A user must not be able to revoke another account's refresh token via /logout."""
    u2 = client.post(
        "/api/v1/auth/login",
        data={"username": premium_user.email, "password": "premium123"},
    )
    assert u2.status_code == 200
    other_refresh = u2.json()["refresh_token"]

    u1 = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "testpass123"},
    )
    assert u1.status_code == 200
    u1_access = u1.json()["access_token"]

    logout = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": other_refresh},
        headers={"Authorization": f"Bearer {u1_access}"},
    )
    assert logout.status_code == status.HTTP_200_OK

    still = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": other_refresh},
    )
    assert still.status_code == status.HTTP_200_OK


def test_logout_revokes_refresh_token(client, test_user):
    login = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "testpass123"},
    )
    tokens = login.json()
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    logout = client.post(
        "/api/v1/auth/logout",
        json={"refresh_token": tokens["refresh_token"]},
        headers=headers,
    )
    assert logout.status_code == status.HTTP_200_OK
    refresh = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": tokens["refresh_token"]},
    )
    assert refresh.status_code == status.HTTP_401_UNAUTHORIZED


def test_refresh_rotates_token(client, test_user):
    login = client.post(
        "/api/v1/auth/login",
        data={"username": test_user.email, "password": "testpass123"},
    )
    old_refresh = login.json()["refresh_token"]
    refreshed = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert refreshed.status_code == status.HTTP_200_OK
    new_refresh = refreshed.json()["refresh_token"]
    assert new_refresh != old_refresh
    stale = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": old_refresh},
    )
    assert stale.status_code == status.HTTP_401_UNAUTHORIZED
