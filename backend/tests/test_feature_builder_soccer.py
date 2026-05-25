"""Soccer features from team_standings when both sides have rows."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import joinedload

from app.models.game import Game
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.config import get_settings
from app.services.feature_builder import (
    build_feature_dict,
    build_game_features,
    expected_scores_for_league,
)


def test_soccer_features_use_standings_and_recent_games(db):
    h = Team(id=uuid4(), name="Homers FC", league="premier_league", abbreviation="HOM")
    a = Team(id=uuid4(), name="AwayTown", league="premier_league", abbreviation="AWY")
    db.add_all([h, a])
    db.flush()
    db.add(
        TeamStanding(
            league="premier_league",
            team_id=h.id,
            league_rank=2,
            played=10,
            wins=6,
            draws=2,
            losses=2,
            points=20,
            goals_for=18,
            goals_against=10,
        )
    )
    db.add(
        TeamStanding(
            league="premier_league",
            team_id=a.id,
            league_rank=8,
            played=10,
            wins=3,
            draws=3,
            losses=4,
            points=12,
            goals_for=11,
            goals_against=15,
        )
    )
    past = datetime(2030, 1, 1, 12, 0, tzinfo=timezone.utc)
    db.add(
        Game(
            id=uuid4(),
            league="premier_league",
            home_team_id=h.id,
            away_team_id=a.id,
            scheduled_time=past,
            status="finished",
            home_score=2,
            away_score=1,
        )
    )
    kickoff = past + timedelta(days=30)
    g = Game(
        id=uuid4(),
        league="premier_league",
        home_team_id=h.id,
        away_team_id=a.id,
        scheduled_time=kickoff,
        status="scheduled",
    )
    db.add(g)
    db.commit()

    g2 = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == g.id)
        .first()
    )
    feats = build_feature_dict(g2, db)
    assert feats["home_team_win_rate"] == 0.7
    assert feats["away_team_win_rate"] == 0.45
    assert feats["home_team_recent_form"] == 1.0
    assert feats["home_advantage"] >= 0.02


def test_soccer_features_fallback_to_sportradar_api_without_team_standings(db, monkeypatch):
    """If team_standings rows are missing, use cached Sportradar standings fetch."""
    monkeypatch.setenv("SPORTRADAR_API_KEY", "test-key")
    monkeypatch.setenv("SPORTRADAR_SOCCER_SEASON_PREMIER_LEAGUE", "sr:season:api_test")
    get_settings.cache_clear()

    h = Team(id=uuid4(), name="Liverpool FC", league="premier_league", abbreviation="LIV")
    a = Team(id=uuid4(), name="Arsenal FC", league="premier_league", abbreviation="ARS")
    db.add_all([h, a])
    db.flush()
    kickoff = datetime(2032, 2, 1, 15, 0, tzinfo=timezone.utc)
    g = Game(
        id=uuid4(),
        league="premier_league",
        home_team_id=h.id,
        away_team_id=a.id,
        scheduled_time=kickoff,
        status="scheduled",
    )
    db.add(g)
    db.commit()

    payload = {
        "standings": [
            {
                "type": "total",
                "groups": [
                    {
                        "standings": [
                            {
                                "competitor": {"abbreviation": "LIV", "name": "Liverpool FC"},
                                "rank": 1,
                                "win": 10,
                                "draw": 2,
                                "loss": 1,
                                "points": 32,
                                "goals_for": 30,
                                "goals_against": 10,
                            },
                            {
                                "competitor": {"abbreviation": "ARS", "name": "Arsenal FC"},
                                "rank": 2,
                                "win": 9,
                                "draw": 3,
                                "loss": 1,
                                "points": 30,
                                "goals_for": 28,
                                "goals_against": 12,
                            },
                        ]
                    }
                ],
            }
        ]
    }

    import app.services.sportradar_soccer_service as soccer_mod

    monkeypatch.setattr(
        soccer_mod,
        "fetch_soccer_standings_json",
        lambda _settings, _sid: (payload, "sr:season:api_test"),
    )

    g2 = (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == g.id)
        .first()
    )
    feats, src = build_game_features(g2, db)
    assert src == "soccer_sportradar_api"
    # (10 + 0.5*2) / 13
    assert abs(float(feats["home_team_win_rate"]) - (11.0 / 13.0)) < 0.001
    assert abs(float(feats["away_team_avg_score"]) - (28.0 / 13.0)) < 0.001


def test_expected_scores_soccer_use_goals_per_game_when_plausible():
    h, a = expected_scores_for_league(
        "premier_league",
        0.5,
        home_team_avg_score=1.8,
        away_team_avg_score=1.1,
    )
    assert h > a
    assert 0.2 <= h <= 3.5
    assert 0.2 <= a <= 3.5


def test_expected_scores_soccer_favor_home_when_win_prob_high():
    low = expected_scores_for_league(
        "premier_league", 0.42, home_team_avg_score=1.5, away_team_avg_score=1.5
    )
    high = expected_scores_for_league(
        "premier_league", 0.72, home_team_avg_score=1.5, away_team_avg_score=1.5
    )
    assert high[0] >= low[0]
    assert high[1] <= low[1]


def test_expected_scores_soccer_ignores_points_scale_avgs():
    """Synthetic / wrong features use league baseline, not 20+ 'goals'."""
    h, a = expected_scores_for_league(
        "premier_league",
        0.5,
        home_team_avg_score=24.0,
        away_team_avg_score=22.0,
    )
    assert h < 5.0 and a < 5.0
    assert abs(h - 1.65) < 0.05 and abs(a - 1.35) < 0.05
