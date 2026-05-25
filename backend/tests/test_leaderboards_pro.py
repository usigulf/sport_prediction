"""Leaderboards require Pro subscription."""
import pytest
from fastapi import status


def test_leaderboards_requires_pro(client, auth_headers):
    response = client.get("/api/v1/leaderboards", headers=auth_headers)
    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_leaderboards_pro_user(client, pro_auth_headers):
    response = client.get("/api/v1/leaderboards", headers=pro_auth_headers)
    assert response.status_code == status.HTTP_200_OK
