"""Player props: model projections from predictions and spotlights."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import status

from app.models.game_player_spotlight import GamePlayerSpotlight


def test_player_props_free_user_forbidden(client, auth_headers, test_game, test_prediction):
    r = client.get(f"/api/v1/games/{test_game.id}/player-props", headers=auth_headers)
    assert r.status_code == status.HTTP_403_FORBIDDEN


def test_player_props_team_estimates_for_premium(
    client, premium_auth_headers, test_game, test_prediction, test_teams
):
    r = client.get(
        f"/api/v1/games/{test_game.id}/player-props",
        headers=premium_auth_headers,
    )
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["count"] >= 2
    assert body["has_named_players"] is False
    assert "model est." in body["props"][0]["player_name"]
    assert body["props"][0]["prop_type"] == "passing_yards"
    assert "disclaimer" in body


def test_player_props_use_spotlight_names(
    client, premium_auth_headers, test_game, test_prediction, test_teams, db
):
    db.add(
        GamePlayerSpotlight(
            id=uuid4(),
            game_id=test_game.id,
            player_name="Patrick Mahomes",
            team_name=test_teams[0].name,
            role="Quarterback",
            summary="Elite form",
            sort_order=0,
        )
    )
    db.commit()

    r = client.get(
        f"/api/v1/games/{test_game.id}/player-props",
        headers=premium_auth_headers,
    )
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["has_named_players"] is True
    names = [p["player_name"] for p in body["props"]]
    assert "Patrick Mahomes" in names
    assert all("model est." not in n for n in names)


def test_player_props_feed_premium(client, premium_auth_headers, test_game, test_prediction, db):
    kickoff = datetime.now(timezone.utc) + timedelta(hours=4)
    test_game.scheduled_time = kickoff
    db.commit()

    ymd = kickoff.strftime("%Y-%m-%d")
    r = client.get(
        "/api/v1/feed/player-props",
        headers=premium_auth_headers,
        params={"date": ymd, "time_zone": "UTC", "limit": 5},
    )
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert body["count"] >= 1
    assert body["items"][0]["prop_count"] >= 1
