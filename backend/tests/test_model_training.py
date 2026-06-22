"""
Training pipeline: learns a clear home-strength signal end-to-end and writes
artifacts that the inference loader (predict_from_artifacts) can consume.
"""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.services.ml_artifacts import predict_from_artifacts
from app.services.model_training import (
    ARTIFACT_FEATURES,
    ARTIFACT_MODEL,
    FEATURE_COLUMNS,
    assess_publish_readiness,
    build_training_frame,
    train_and_save,
)


def _seed_separable_nfl_history(db, n_games: int = 60):
    """
    Two teams with opposite strength. Strong team always wins; home side
    alternates so the label depends on which side the strong team is on — a
    cleanly separable signal for the model to learn.
    """
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
    return strong, weak


def test_build_training_frame_excludes_draws_and_labels_home_win(db):
    _seed_separable_nfl_history(db, n_games=20)
    # Add a draw — must be excluded from training.
    s = db.query(Team).filter(Team.abbreviation == "KC").first()
    w = db.query(Team).filter(Team.abbreviation == "BUF").first()
    db.add(
        Game(
            id=uuid4(),
            league="nfl",
            home_team_id=s.id,
            away_team_id=w.id,
            scheduled_time=datetime(2030, 6, 1, tzinfo=timezone.utc),
            status="finished",
            home_score=14,
            away_score=14,
        )
    )
    db.commit()

    X, y, leagues, _times = build_training_frame(db)
    assert len(X) == 20  # draw excluded
    assert list(X.columns) == FEATURE_COLUMNS
    assert set(y.unique()) == {0, 1}
    assert all(l == "nfl" for l in leagues)


def test_train_and_save_learns_signal_and_roundtrips(db, tmp_path):
    _seed_separable_nfl_history(db, n_games=60)
    out_dir = str(tmp_path / "models")

    summary = train_and_save(
        db, out_dir, test_frac=0.2, min_games=10, min_publish_holdout_per_league_group=5, force=True
    )

    assert summary["games"] == 60
    assert (tmp_path / "models" / ARTIFACT_MODEL).exists()
    assert (tmp_path / "models" / ARTIFACT_FEATURES).exists()
    # Separable signal → strong holdout accuracy.
    assert summary["eval"]["accuracy"] >= 0.8
    # A trained model should beat the constant baseline's Brier score.
    assert summary["eval"]["brier"] <= summary["eval"]["baseline_brier"] + 1e-9

    # Inference loader consumes the artifacts and favors the strong home side.
    strong_home = {
        "home_team_win_rate": 0.857,
        "away_team_win_rate": 0.214,
        "home_team_avg_score": 30.0,
        "away_team_avg_score": 10.0,
        "home_team_recent_form": 0.95,
        "away_team_recent_form": 0.05,
        "home_advantage": 0.05,
        "rest_days_home": 7,
        "rest_days_away": 7,
    }
    out = predict_from_artifacts(out_dir, strong_home)
    assert out is not None
    assert out["model_version"] == "sklearn_simple"
    assert out["home_win_probability"] > 0.6


def test_train_and_save_aborts_on_tiny_dataset(db):
    _seed_separable_nfl_history(db, n_games=6)
    try:
        train_and_save(db, "/tmp/should_not_write", min_games=60, force=False)
        assert False, "expected ValueError for tiny dataset"
    except ValueError as e:
        assert "min_games" in str(e)


def test_assess_publish_readiness_blocks_small_holdout():
    leagues = ["nfl"] * 60
    ready, reasons, corpus, holdout = assess_publish_readiness(
        leagues, n=60, test_frac=0.2, min_holdout_per_group=500
    )
    assert ready is False
    assert reasons
    assert corpus["football"] == 60
    assert holdout["football"] == 12


def test_train_and_save_writes_metrics_only_when_publish_blocked(db, tmp_path):
    _seed_separable_nfl_history(db, n_games=60)
    out_dir = str(tmp_path / "models")
    summary = train_and_save(
        db,
        out_dir,
        test_frac=0.2,
        min_games=10,
        min_publish_holdout_per_league_group=500,
        force=False,
    )
    assert summary["publish_ready"] is False
    assert summary["artifacts_written"] is False
    assert summary["status"] == "warming"
    assert not (tmp_path / "models" / ARTIFACT_MODEL).exists()
    assert (tmp_path / "models" / "metrics.json").exists()
