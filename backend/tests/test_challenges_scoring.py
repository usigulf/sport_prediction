"""Challenge resolution uses 1X2 soccer scoring (including draws)."""

from datetime import datetime, timezone

from app.models.game import Game
from app.models.prediction import Prediction


def test_challenge_scores_soccer_draw_correct(client, pro_auth_headers, db, test_teams):
    home, away = test_teams
    g = Game(
        league="premier_league",
        home_team_id=home.id,
        away_team_id=away.id,
        scheduled_time=datetime.now(timezone.utc),
        status="scheduled",
        home_score=0,
        away_score=0,
    )
    db.add(g)
    db.flush()
    db.add(
        Prediction(
            game_id=g.id,
            home_win_probability=0.31,
            away_win_probability=0.31,
            confidence_level="medium",
            model_version="test",
        )
    )
    db.commit()

    create = client.post(
        "/api/v1/challenges",
        headers=pro_auth_headers,
        json={"game_ids": [str(g.id)]},
    )
    assert create.status_code == 200
    cid = create.json()["id"]

    g.status = "finished"
    g.home_score = 1
    g.away_score = 1
    db.commit()

    detail = client.get(f"/api/v1/challenges/{cid}", headers=pro_auth_headers)
    assert detail.status_code == 200
    assert detail.json()["status"] == "completed"
    assert detail.json()["correct_count"] == 1
    assert detail.json()["total_count"] == 1
