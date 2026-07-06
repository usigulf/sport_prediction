"""Subscription tier normalization and paid-access gating."""
import pytest
from fastapi import status

from app.models.user import User
from app.utils.subscription_tiers import (
    has_paid_access,
    is_free_tier,
    normalize_subscription_tier,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        (None, "free"),
        ("", "free"),
        ("free", "free"),
        ("premium", "premium"),
        ("premium_plus", "premium_plus"),
        ("pro", "premium_plus"),
        ("trialing", "premium"),
        (" TRIALING ", "premium"),
        ("unknown", "free"),
    ],
)
def test_normalize_subscription_tier(raw, expected):
    assert normalize_subscription_tier(raw) == expected


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("free", False),
        ("premium", True),
        ("premium_plus", True),
        ("pro", True),
        ("trialing", True),
    ],
)
def test_has_paid_access(raw, expected):
    assert has_paid_access(raw) is expected
    assert is_free_tier(raw) is (not expected)


def _login_headers(client, email: str, password: str) -> dict:
    r = client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def legacy_pro_user(db):
    from uuid import uuid4
    from app.core.security import get_password_hash

    user = User(
        id=uuid4(),
        email="legacypro@example.com",
        password_hash=get_password_hash("legacypro123"),
        subscription_tier="pro",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def trialing_user(db):
    from uuid import uuid4
    from app.core.security import get_password_hash

    user = User(
        id=uuid4(),
        email="trialing@example.com",
        password_hash=get_password_hash("trial123"),
        subscription_tier="trialing",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def legacy_pro_auth_headers(client, legacy_pro_user):
    return _login_headers(client, legacy_pro_user.email, "legacypro123")


@pytest.fixture
def trialing_auth_headers(client, trialing_user):
    return _login_headers(client, trialing_user.email, "trial123")


def test_legacy_pro_tier_gets_game_prediction(
    client, legacy_pro_auth_headers, test_game, test_prediction
):
    r = client.get(f"/api/v1/games/{test_game.id}", headers=legacy_pro_auth_headers)
    assert r.status_code == status.HTTP_200_OK
    assert r.json().get("prediction") is not None


def test_trialing_tier_gets_live_predictions(
    client, trialing_auth_headers, test_game, test_prediction, db
):
    test_game.status = "live"
    db.commit()
    r = client.get(
        f"/api/v1/games/{test_game.id}/live-predictions",
        headers=trialing_auth_headers,
    )
    assert r.status_code in (status.HTTP_200_OK, status.HTTP_404_NOT_FOUND)
    if r.status_code == status.HTTP_403_FORBIDDEN:
        pytest.fail("trialing tier should have live prediction access")


def test_legacy_pro_tier_accesses_leaderboards(
    client, legacy_pro_auth_headers, db, test_teams, test_game, test_prediction
):
    r = client.get("/api/v1/leaderboards", headers=legacy_pro_auth_headers)
    assert r.status_code == status.HTTP_200_OK
