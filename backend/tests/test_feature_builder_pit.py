"""Point-in-time standings override stale snapshot rows for feature building."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import joinedload

from app.models.game import Game
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.services.feature_builder import build_game_features
from app.services.point_in_time_standings import (
    PIT_MIN_TEAM_GAMES,
    league_table_from_finished,
)


def _add_finished(db, *, league, home, away, when, hs, aws):
    g = Game(
        id=uuid4(),
        league=league,
        home_team_id=home.id,
        away_team_id=away.id,
        scheduled_time=when,
        status="finished",
        home_score=hs,
        away_score=aws,
    )
    db.add(g)
    return g


def test_pit_soccer_overrides_stale_snapshot(db):
    """Full-season snapshot must not leak into an early-season kickoff."""
    h = Team(id=uuid4(), name="Homers FC", league="premier_league", abbreviation="HOM")
    a = Team(id=uuid4(), name="AwayTown", league="premier_league", abbreviation="AWY")
    db.add_all([h, a])
    db.flush()
    # Stale snapshot: both teams look mid-table after many games.
    db.add_all(
        [
            TeamStanding(
                league="premier_league",
                team_id=h.id,
                league_rank=2,
                played=20,
                wins=12,
                draws=4,
                losses=4,
                points=40,
                goals_for=35,
                goals_against=20,
            ),
            TeamStanding(
                league="premier_league",
                team_id=a.id,
                league_rank=15,
                played=20,
                wins=4,
                draws=4,
                losses=12,
                points=16,
                goals_for=18,
                goals_against=35,
            ),
        ]
    )
    t0 = datetime(2030, 8, 1, 12, 0, tzinfo=timezone.utc)
    # Home unbeaten in three prior league games; away lost all three.
    for i, (hs, aws) in enumerate([(2, 0), (1, 0), (3, 1)]):
        _add_finished(
            db,
            league="premier_league",
            home=h,
            away=a,
            when=t0 + timedelta(days=7 * i),
            hs=hs,
            aws=aws,
        )
    kickoff = t0 + timedelta(days=30)
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
    feats, src = build_game_features(g2, db)
    assert src == "soccer_pit_standings"
    assert feats["home_team_win_rate"] == 1.0
    assert feats["away_team_win_rate"] == 0.0
    # Snapshot would have been 0.7 vs 0.3 — PIT must differ.
    assert feats["home_team_win_rate"] != 0.7


def test_pit_fallback_to_snapshot_when_insufficient_history(db):
    """Fewer than PIT_MIN_TEAM_GAMES → keep synced standings."""
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
    _add_finished(db, league="premier_league", home=h, away=a, when=past, hs=2, aws=1)
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
    feats, src = build_game_features(g2, db)
    assert src == "soccer_db_standings"
    assert feats["home_team_win_rate"] == 0.7
    assert feats["away_team_win_rate"] == 0.45


def test_league_table_from_finished_ranks_by_points(db):
    t1 = Team(id=uuid4(), name="Alpha", league="mls", abbreviation="ALP")
    t2 = Team(id=uuid4(), name="Beta", league="mls", abbreviation="BET")
    games = [
        Game(
            id=uuid4(),
            league="mls",
            home_team_id=t1.id,
            away_team_id=t2.id,
            scheduled_time=datetime(2030, 3, 1, tzinfo=timezone.utc),
            status="finished",
            home_score=2,
            away_score=0,
        ),
        Game(
            id=uuid4(),
            league="mls",
            home_team_id=t2.id,
            away_team_id=t1.id,
            scheduled_time=datetime(2030, 3, 8, tzinfo=timezone.utc),
            status="finished",
            home_score=1,
            away_score=1,
        ),
    ]
    table = league_table_from_finished(games, soccer=True)
    assert table[t1.id].wins == 1 and table[t1.id].draws == 1
    assert table[t2.id].draws == 1 and table[t2.id].losses == 1
    assert table[t1.id].league_rank == 1
    assert table[t2.id].league_rank == 2
    assert PIT_MIN_TEAM_GAMES == 3
