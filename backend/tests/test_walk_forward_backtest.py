"""Walk-forward backtest folds and end-to-end scoring."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.services.walk_forward_backtest import (
    run_walk_forward_backtest,
    walk_forward_fold_ranges,
)


def _seed_nfl_history(db, n_games: int = 100):
    strong = Team(id=uuid4(), name="Strong NFL", league="nfl", abbreviation="KC")
    weak = Team(id=uuid4(), name="Weak NFL", league="nfl", abbreviation="BUF")
    db.add_all([strong, weak])
    db.flush()
    db.add(
        TeamStanding(
            league="nfl", team_id=strong.id, league_rank=1, played=14, wins=12, draws=0, losses=2
        )
    )
    db.add(
        TeamStanding(
            league="nfl", team_id=weak.id, league_rank=16, played=14, wins=3, draws=0, losses=11
        )
    )
    base = datetime(2030, 1, 1, tzinfo=timezone.utc)
    for i in range(n_games):
        strong_home = i % 2 == 0
        home, away = (strong, weak) if strong_home else (weak, strong)
        hs, as_ = (30, 10) if strong_home else (10, 30)
        db.add(
            Game(
                id=uuid4(),
                league="nfl",
                home_team_id=home.id,
                away_team_id=away.id,
                scheduled_time=base + timedelta(days=i),
                status="finished",
                home_score=hs,
                away_score=as_,
            )
        )
    db.commit()


def test_walk_forward_fold_ranges_expanding_window():
    assert walk_forward_fold_ranges(100, min_train_games=60, test_window_games=20) == [
        (60, 80),
        (80, 100),
    ]
    assert walk_forward_fold_ranges(50, min_train_games=60, test_window_games=20) == []


def test_run_walk_forward_backtest_football(db):
    _seed_nfl_history(db, n_games=100)
    report = run_walk_forward_backtest(
        db,
        min_train_games=40,
        test_window_games=20,
        groups=["football"],
    )
    football = report["groups"]["football"]
    assert football["status"] == "ok"
    assert football["total_games"] == 100
    assert len(football["folds"]) >= 2
    ok_folds = [f for f in football["folds"] if f.get("status") == "ok"]
    assert ok_folds
    assert football["aggregate"]["scored_games"] > 0
    assert 0.0 <= football["aggregate"]["accuracy"] <= 1.0
    assert football["aggregate"]["mean_log_loss"] >= 0.0
