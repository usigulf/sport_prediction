"""Stats endpoints and trust_metrics scoring rules."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.prediction import Prediction
from app.models.team_standing import TeamStanding
from app.services.trust_metrics_service import (
    aggregate_accuracy_from_finished,
    implied_draw_probability,
    prediction_correct_vs_result,
)


def test_implied_draw_zero_when_home_plus_away_full_mass():
    assert implied_draw_probability(0.5, 0.5) == 0.0


def test_prediction_correct_soccer_predicts_draw(db, test_teams):
    g = Game(
        id=uuid4(),
        league="premier_league",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=1),
        status="finished",
        home_score=2,
        away_score=2,
    )
    db.add(g)
    db.flush()
    pred = Prediction(
        id=uuid4(),
        game_id=g.id,
        model_version="v1",
        home_win_probability=0.25,
        away_win_probability=0.25,
        confidence_level="medium",
    )
    db.add(pred)
    db.commit()
    assert prediction_correct_vs_result(g, pred) is True


def test_prediction_correct_nfl_tie_not_counted_as_favorite_win(db, test_teams):
    g = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=1),
        status="finished",
        home_score=17,
        away_score=17,
    )
    db.add(g)
    db.flush()
    pred = Prediction(
        id=uuid4(),
        game_id=g.id,
        model_version="v1",
        home_win_probability=0.61,
        away_win_probability=0.39,
        confidence_level="high",
    )
    db.add(pred)
    db.commit()
    assert prediction_correct_vs_result(g, pred) is False


def test_prediction_correct_soccer_home_win(db, test_teams):
    g = Game(
        id=uuid4(),
        league="premier_league",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=1),
        status="finished",
        home_score=3,
        away_score=0,
    )
    db.add(g)
    db.flush()
    pred = Prediction(
        id=uuid4(),
        game_id=g.id,
        model_version="v1",
        home_win_probability=0.72,
        away_win_probability=0.18,
        confidence_level="high",
    )
    db.add(pred)
    db.commit()
    assert prediction_correct_vs_result(g, pred) is True


def test_prediction_correct_soccer_away_win(db, test_teams):
    g = Game(
        id=uuid4(),
        league="bundesliga",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=1),
        status="finished",
        home_score=0,
        away_score=2,
    )
    db.add(g)
    db.flush()
    pred = Prediction(
        id=uuid4(),
        game_id=g.id,
        model_version="v1",
        home_win_probability=0.22,
        away_win_probability=0.63,
        confidence_level="medium",
    )
    db.add(pred)
    db.commit()
    assert prediction_correct_vs_result(g, pred) is True


def test_prediction_correct_nfl_away_favorite_wins(db, test_teams):
    g = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=1),
        status="finished",
        home_score=14,
        away_score=31,
    )
    db.add(g)
    db.flush()
    pred = Prediction(
        id=uuid4(),
        game_id=g.id,
        model_version="v1",
        home_win_probability=0.42,
        away_win_probability=0.58,
        confidence_level="high",
    )
    db.add(pred)
    db.commit()
    assert prediction_correct_vs_result(g, pred) is True


def test_aggregate_skips_finished_game_without_prediction(db, test_teams):
    g = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=3),
        status="finished",
        home_score=21,
        away_score=20,
    )
    db.add(g)
    db.commit()
    agg = aggregate_accuracy_from_finished(db)
    assert agg["total_games"] == 0


def test_aggregate_maps_invalid_confidence_to_unknown_bucket(db, test_teams):
    g = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=2),
        status="finished",
        home_score=30,
        away_score=27,
    )
    db.add(g)
    db.flush()
    db.add(
        Prediction(
            id=uuid4(),
            game_id=g.id,
            model_version="v1",
            home_win_probability=0.55,
            away_win_probability=0.45,
            confidence_level="nonsense_label",
        )
    )
    db.commit()
    agg = aggregate_accuracy_from_finished(db)
    assert agg["total_games"] == 1
    assert agg["by_confidence"]["unknown"]["total"] == 1


def test_stats_accuracy_public_shape(client, db, test_teams):
    g = Game(
        id=uuid4(),
        league="premier_league",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) - timedelta(days=5),
        status="finished",
        home_score=1,
        away_score=1,
    )
    db.add(g)
    db.flush()
    db.add(
        Prediction(
            id=uuid4(),
            game_id=g.id,
            model_version="v1",
            home_win_probability=0.20,
            away_win_probability=0.20,
            confidence_level="low",
        )
    )
    db.commit()

    r = client.get("/api/v1/stats/accuracy")
    assert r.status_code == 200
    body = r.json()
    assert body["total_games"] >= 1
    assert "accuracy_pct" in body
    assert "by_league" in body
    assert "by_confidence" in body
    assert "rolling_30d" in body
    assert body["rolling_30d"]["window_start_iso"]
    assert "methodology" in body
    assert body["methodology"]["short"]
    assert body["methodology"]["detail"]
    assert "major professional" in body["methodology"]["detail"].lower()
    assert "computed_at_iso" in body
    assert body["computed_at_iso"]


def test_stats_coverage_lists_standings_counts(client, db, test_teams):
    db.add(
        TeamStanding(
            id=uuid4(),
            league="premier_league",
            team_id=test_teams[0].id,
            league_rank=3,
            played=10,
            wins=5,
            draws=2,
            losses=3,
        )
    )
    db.commit()

    r = client.get("/api/v1/stats/coverage")
    assert r.status_code == 200
    body = r.json()
    assert "disclaimer" in body
    assert "summary" in body
    assert body["summary"]["leagues_with_standings"] >= 1
    assert body["summary"]["latest_standings_sync_iso"] is not None
    leagues = {row["league"]: row for row in body["leagues"]}
    assert leagues["premier_league"]["standings_rows"] >= 1
    assert leagues["premier_league"]["standings_last_updated_iso"] is not None
