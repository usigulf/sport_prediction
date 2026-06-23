"""Leaderboards require Pro subscription."""
import pytest
from fastapi import status


def test_leaderboards_requires_pro(client, auth_headers):
    response = client.get("/api/v1/leaderboards", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_leaderboards_pro_user(client, pro_auth_headers):
    response = client.get("/api/v1/leaderboards", headers=pro_auth_headers)
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert "entries" in body
    assert "community_warming" in body
    assert "min_active_users" in body
    assert body["min_active_users"] == 50
