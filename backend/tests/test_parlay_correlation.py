"""Tests for parlay correlation warnings (I66)."""
from uuid import uuid4

from fastapi import status

from app.services.parlay_correlation_service import analyze_parlay_correlation


def test_parlay_no_warnings_single_leg(db, test_game):
    out = analyze_parlay_correlation(db, [str(test_game.id)])
    assert out["risk_level"] == "none"
    assert out["warnings"] == []


def test_parlay_duplicate_leg_warning(db, test_game):
    gid = str(test_game.id)
    out = analyze_parlay_correlation(db, [gid, gid])
    assert out["risk_level"] == "high"
    codes = [w["code"] for w in out["warnings"]]
    assert "duplicate_leg" in codes


def test_parlay_shared_team_warning(db, test_teams):
    from datetime import datetime, timedelta
    from app.models.game import Game

    g1 = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now() + timedelta(days=1),
        status="scheduled",
    )
    g2 = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now() + timedelta(days=2),
        status="scheduled",
    )
    db.add_all([g1, g2])
    db.commit()
    out = analyze_parlay_correlation(db, [str(g1.id), str(g2.id)])
    assert any(w["code"] == "shared_team" for w in out["warnings"])


def test_parlay_correlation_endpoint(client, test_game):
    r = client.post(
        "/api/v1/tools/parlay-correlation",
        json={"game_ids": [str(test_game.id)]},
    )
    assert r.status_code == status.HTTP_200_OK
    assert "disclaimer" in r.json()
