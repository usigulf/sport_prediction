"""
Regression tests for two prediction-integrity fixes:
1. Soccer 1X2 now carries a real draw arm (home + away < 1), so a draw can be predicted.
2. NFL/NBA use real standings / recent-game features (or a deterministic neutral
   baseline), never random synthetic noise.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import joinedload

from app.models.game import Game
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.services.feature_builder import build_game_features
from app.services.ml_artifacts import (
    confidence_from_three_way,
    soccer_three_way_from_home_edge,
)
from app.services.prediction_inference_service import _predict_for_game
from app.services.trust_metrics_service import (
    implied_draw_probability,
    prediction_correct_vs_result,
)


def _load(db, game_id):
    return (
        db.query(Game)
        .options(joinedload(Game.home_team), joinedload(Game.away_team))
        .filter(Game.id == game_id)
        .first()
    )


def test_soccer_three_way_sums_to_one_with_real_draw():
    for edge in (0.5, 0.6, 0.8, 0.3, 0.95):
        home_p, draw_p, away_p = soccer_three_way_from_home_edge(edge)
        assert abs(home_p + draw_p + away_p - 1.0) < 1e-6
        assert draw_p >= 0.10  # never zero, unlike the old behaviour
        # Stored pair must leave room for the draw.
        assert home_p + away_p < 1.0


def test_soccer_three_way_draw_peaks_for_even_matchups():
    even_draw = soccer_three_way_from_home_edge(0.5)[1]
    lopsided_draw = soccer_three_way_from_home_edge(0.95)[1]
    assert even_draw > lopsided_draw


def test_confidence_from_three_way_buckets():
    assert confidence_from_three_way(0.62, 0.22, 0.16) == "high"
    assert confidence_from_three_way(0.45, 0.30, 0.25) == "medium"
    assert confidence_from_three_way(0.38, 0.34, 0.28) == "low"


def test_predict_for_game_soccer_has_nonzero_implied_draw(db):
    h = Team(id=uuid4(), name="Homers FC", league="premier_league", abbreviation="HOM")
    a = Team(id=uuid4(), name="AwayTown", league="premier_league", abbreviation="AWY")
    db.add_all([h, a])
    db.flush()
    g = Game(
        id=uuid4(),
        league="premier_league",
        home_team_id=h.id,
        away_team_id=a.id,
        scheduled_time=datetime(2031, 3, 1, 15, 0, tzinfo=timezone.utc),
        status="scheduled",
    )
    db.add(g)
    db.commit()

    out, _feats, _src = _predict_for_game(_load(db, g.id), db)
    hp = float(out["home_win_probability"])
    ap = float(out["away_win_probability"])
    assert hp + ap < 1.0
    assert implied_draw_probability(hp, ap) > 0.05


def test_soccer_draw_can_be_predicted_correct():
    """A near-even matchup that ends level should now be graded as a correct draw pick."""
    h = Team(id=uuid4(), name="Even A", league="premier_league", abbreviation="EVA")
    a = Team(id=uuid4(), name="Even B", league="premier_league", abbreviation="EVB")
    home_p, draw_p, away_p = soccer_three_way_from_home_edge(0.5)
    game = Game(
        id=uuid4(),
        league="premier_league",
        home_team=h,
        away_team=a,
        home_score=1,
        away_score=1,
        status="finished",
    )

    class _Pred:
        home_win_probability = home_p
        away_win_probability = away_p

    # Draw arm is the largest for an even matchup, and the result was a draw.
    assert draw_p > home_p and draw_p > away_p
    assert prediction_correct_vs_result(game, _Pred()) is True


def test_us_features_use_real_recent_scores_not_random(db):
    h = Team(id=uuid4(), name="Hometown Hoops", league="nba", abbreviation="HOM")
    a = Team(id=uuid4(), name="Roadtrip Ballers", league="nba", abbreviation="RDT")
    db.add_all([h, a])
    db.flush()
    base = datetime(2031, 1, 1, 0, 0, tzinfo=timezone.utc)
    # Home team scored 120, 118 in last two finished games; away scored 100, 96.
    for i, (hs, as_) in enumerate([(120, 100), (118, 96)]):
        db.add(
            Game(
                id=uuid4(),
                league="nba",
                home_team_id=h.id,
                away_team_id=a.id,
                scheduled_time=base + timedelta(days=i),
                status="finished",
                home_score=hs,
                away_score=as_,
            )
        )
    g = Game(
        id=uuid4(),
        league="nba",
        home_team_id=h.id,
        away_team_id=a.id,
        scheduled_time=base + timedelta(days=10),
        status="scheduled",
    )
    db.add(g)
    db.commit()

    feats, src = build_game_features(_load(db, g.id), db)
    assert src in ("us_recent_form", "us_db_standings")
    # Average of real scored points, not the old rng.uniform(20, 30).
    assert feats["home_team_avg_score"] == 119.0
    assert feats["home_team_avg_score"] > 30


def test_us_features_neutral_baseline_when_no_data(db):
    h = Team(id=uuid4(), name="Fresh NFL A", league="nfl", abbreviation="FNA")
    a = Team(id=uuid4(), name="Fresh NFL B", league="nfl", abbreviation="FNB")
    db.add_all([h, a])
    db.flush()
    g = Game(
        id=uuid4(),
        league="nfl",
        home_team_id=h.id,
        away_team_id=a.id,
        scheduled_time=datetime(2031, 9, 1, 18, 0, tzinfo=timezone.utc),
        status="scheduled",
    )
    db.add(g)
    db.commit()

    feats, src = build_game_features(_load(db, g.id), db)
    assert src == "neutral_baseline"
    assert feats["home_team_win_rate"] == 0.5
    assert feats["away_team_win_rate"] == 0.5
    assert feats["home_advantage"] > 0


def test_us_features_use_standings_when_present(db):
    h = Team(id=uuid4(), name="Standings NBA A", league="nba", abbreviation="SNA")
    a = Team(id=uuid4(), name="Standings NBA B", league="nba", abbreviation="SNB")
    db.add_all([h, a])
    db.flush()
    db.add(
        TeamStanding(
            league="nba", team_id=h.id, league_rank=1, played=10, wins=8, draws=0, losses=2
        )
    )
    db.add(
        TeamStanding(
            league="nba", team_id=a.id, league_rank=12, played=10, wins=3, draws=0, losses=7
        )
    )
    g = Game(
        id=uuid4(),
        league="nba",
        home_team_id=h.id,
        away_team_id=a.id,
        scheduled_time=datetime(2031, 2, 1, 1, 0, tzinfo=timezone.utc),
        status="scheduled",
    )
    db.add(g)
    db.commit()

    feats, src = build_game_features(_load(db, g.id), db)
    assert src == "us_db_standings"
    assert feats["home_team_win_rate"] == 0.8
    assert feats["away_team_win_rate"] == 0.3
