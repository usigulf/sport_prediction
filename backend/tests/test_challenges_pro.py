"""Challenges API requires Pro (premium_plus)."""


def test_challenges_list_forbidden_free(client, auth_headers):
    r = client.get("/api/v1/challenges", headers=auth_headers)
    assert r.status_code == 403
    assert "Pro" in r.json().get("detail", "")


def test_challenges_list_forbidden_premium(client, premium_auth_headers):
    r = client.get("/api/v1/challenges", headers=premium_auth_headers)
    assert r.status_code == 403


def test_challenges_list_ok_pro(client, pro_auth_headers):
    r = client.get("/api/v1/challenges", headers=pro_auth_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["count"] == 0
    assert body["challenges"] == []


def test_create_challenge_forbidden_premium(client, premium_auth_headers, test_game):
    r = client.post(
        "/api/v1/challenges",
        headers=premium_auth_headers,
        json={"game_ids": [str(test_game.id)]},
    )
    assert r.status_code == 403


def test_create_challenge_ok_pro(client, pro_auth_headers, test_game):
    r = client.post(
        "/api/v1/challenges",
        headers=pro_auth_headers,
        json={"game_ids": [str(test_game.id)]},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "active"
    assert len(data["game_ids"]) == 1
