"""Phase 7 audit: feature store, community, injuries, weather, ensemble gate, widget."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import status

from app.models.game import Game
from app.models.game_injury_report import GameInjuryReport
from app.models.game_player_spotlight import GamePlayerSpotlight
from app.models.prediction import Prediction
from app.models.user_pick import UserPick
from app.services.community_predictions_service import build_community_vs_model_summary
from app.services.ensemble_gating_service import assess_ensemble_eligibility
from app.services.feature_store_service import feature_store_summary, record_feature_snapshot
from app.services.injury_feed_service import list_injuries_for_game
from app.services.user_brier_service import record_user_pick
from app.services.weather_enrichment_service import weather_for_game


def test_feature_store_record_and_summary(db, test_game):
    record_feature_snapshot(
        db,
        game=test_game,
        features={"home_team_win_rate": 0.6},
        feature_source="us_pit_standings",
        model_version="v1",
    )
    summary = feature_store_summary(db)
    assert summary["total_snapshots"] >= 1


def test_feature_snapshots_endpoint(client, db, test_game):
    record_feature_snapshot(
        db,
        game=test_game,
        features={"home_team_win_rate": 0.55},
        feature_source="test",
    )
    r = client.get(f"/api/v1/games/{test_game.id}/feature-snapshots")
    assert r.status_code == status.HTTP_200_OK
    assert r.json()["snapshot_count"] >= 1


def test_community_vs_model_with_picks(db, test_user, test_teams, premium_user, pro_user):
    from app.models.user import User
    from app.core.security import get_password_hash

    game = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) + timedelta(days=1),
        status="scheduled",
    )
    db.add(game)
    db.add(
        Prediction(
            id=uuid4(),
            game_id=game.id,
            model_version="v1",
            home_win_probability=0.7,
            away_win_probability=0.3,
            confidence_level="high",
        )
    )
    u4 = User(
        id=uuid4(),
        email="comm3@example.com",
        password_hash=get_password_hash("pass12345"),
        subscription_tier="free",
    )
    db.add(u4)
    db.commit()
    for u in (test_user, premium_user, u4):
        record_user_pick(db, user_id=u.id, game=game, outcome="home", probability=0.65)
    summary = build_community_vs_model_summary(db)
    assert summary["upcoming_count"] >= 1


def test_community_endpoint(client):
    r = client.get("/api/v1/stats/community-vs-model")
    assert r.status_code == status.HTTP_200_OK
    assert "disclaimer" in r.json()


def test_injury_sync_from_spotlight(db, test_game):
    db.add(
        GamePlayerSpotlight(
            game_id=test_game.id,
            player_name="Test Player",
            team_name="Team A",
            role="injury",
            summary="Ruled out with knee injury",
            sort_order=0,
        )
    )
    db.commit()
    payload = list_injuries_for_game(db, test_game)
    assert payload["count"] >= 1
    assert payload["injuries"][0]["status"] == "out"


def test_injuries_endpoint(client, db, test_game):
    db.add(
        GameInjuryReport(
            game_id=test_game.id,
            player_name="QB1",
            team_name="Team A",
            status="questionable",
            detail="Ankle",
            source="test",
        )
    )
    db.commit()
    r = client.get(f"/api/v1/games/{test_game.id}/injuries")
    assert r.status_code == status.HTTP_200_OK
    assert r.json()["count"] == 1


def test_weather_nfl_without_key(db, test_game):
    out = weather_for_game(db, test_game)
    assert out["available"] is False
    assert out["reason"] in ("not_configured", "venue_coords_unknown")


def test_weather_non_outdoor_league(db, test_teams):
    game = Game(
        id=uuid4(),
        league="nba",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) + timedelta(days=1),
        status="scheduled",
    )
    db.add(game)
    db.commit()
    out = weather_for_game(db, game)
    assert out["available"] is False
    assert out["reason"] == "league_not_supported"


def test_ensemble_gate_blocks_by_default():
    gate = assess_ensemble_eligibility(None)
    assert gate["ensemble_eligible"] is False


def test_ensemble_gate_with_lift():
    report = {
        "groups": {
            "football": {
                "aggregate": {
                    "mean_log_loss": 0.65,
                    "baseline_mean_log_loss": 0.6931,
                }
            }
        }
    }
    gate = assess_ensemble_eligibility(report)
    assert gate["ensemble_eligible"] is True


def test_widget_top_pick_endpoint(client, test_game, test_prediction):
    r = client.get("/api/v1/feed/widget/top-pick")
    assert r.status_code == status.HTTP_200_OK
    body = r.json()
    assert "disclaimer" in body


def test_feature_store_stats_endpoint(client):
    r = client.get("/api/v1/stats/feature-store")
    assert r.status_code == status.HTTP_200_OK
