"""Feed top-picks: optional date + time_zone aligned with /games/upcoming."""
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import status

from app.models.game import Game


def test_top_picks_date_time_zone_includes_game_with_prediction(
    client, db, test_teams, test_prediction
):
    g = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime(2031, 3, 10, 20, 0, tzinfo=timezone.utc),
        status="scheduled",
    )
    db.add(g)
    db.commit()
    test_prediction.game_id = g.id
    db.commit()

    r = client.get(
        "/api/v1/feed/top-picks",
        params={"date": "2031-03-10", "time_zone": "UTC", "limit": 20},
    )
    assert r.status_code == status.HTTP_200_OK
    ids = [p["id"] for p in r.json().get("picks", [])]
    assert str(g.id) in ids


def test_top_picks_invalid_time_zone(client):
    r = client.get(
        "/api/v1/feed/top-picks",
        params={"date": "2030-01-01", "time_zone": "Not/A_Zone", "limit": 10},
    )
    assert r.status_code == status.HTTP_400_BAD_REQUEST
