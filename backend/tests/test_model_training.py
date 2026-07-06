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
    MODEL_KIND_SOCCER_1X2,
    SOCCER_1X2_LABEL_AWAY,
    SOCCER_1X2_LABEL_DRAW,
    SOCCER_1X2_LABEL_HOME,
    artifacts_publish_ready,
    assess_publish_readiness,
    build_training_frame,
    publish_corpus_min_for_group,
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


def _seed_soccer_1x2_history(db, n_games: int = 72):
    """
    Three teams: strong home side, weak away side, and a draw-prone pair.
    Labels cycle home / away / draw so the native 1X2 model sees all outcomes.
    """
    strong = Team(id=uuid4(), name="Strong FC", league="premier_league", abbreviation="STR")
    weak = Team(id=uuid4(), name="Weak FC", league="premier_league", abbreviation="WEK")
    even_a = Team(id=uuid4(), name="Even A", league="premier_league", abbreviation="EVA")
    even_b = Team(id=uuid4(), name="Even B", league="premier_league", abbreviation="EVB")
    db.add_all([strong, weak, even_a, even_b])
    db.flush()
    for team, rank, wins, draws, losses in (
        (strong, 1, 18, 4, 2),
        (weak, 18, 3, 4, 17),
        (even_a, 8, 10, 8, 6),
        (even_b, 9, 10, 8, 6),
    ):
        db.add(
            TeamStanding(
                league="premier_league",
                team_id=team.id,
                league_rank=rank,
                played=wins + draws + losses,
                wins=wins,
                draws=draws,
                losses=losses,
                points=3 * wins + draws,
                goals_for=30,
                goals_against=20,
            )
        )
    base = datetime(2030, 1, 1, tzinfo=timezone.utc)
    for i in range(n_games):
        mode = i % 3
        if mode == 0:
            home, away, hs, aws = strong, weak, 3, 0
        elif mode == 1:
            home, away, hs, aws = weak, strong, 0, 2
        else:
            home, away, hs, aws = even_a, even_b, 1, 1
        db.add(
            Game(
                id=uuid4(),
                league="premier_league",
                home_team_id=home.id,
                away_team_id=away.id,
                scheduled_time=base + timedelta(days=i),
                status="finished",
                home_score=hs,
                away_score=aws,
            )
        )
    db.commit()
    return strong, weak, even_a, even_b


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
    assert all(league == "nfl" for league in leagues)


def test_build_soccer_training_frame_includes_draws(db):
    _seed_soccer_1x2_history(db, n_games=30)
    X, y, leagues, _times = build_training_frame(db, group="soccer")
    assert len(X) == 30
    assert set(y.unique()) == {
        SOCCER_1X2_LABEL_HOME,
        SOCCER_1X2_LABEL_DRAW,
        SOCCER_1X2_LABEL_AWAY,
    }
    assert all(league == "premier_league" for league in leagues)


def test_soccer_1x2_train_and_predict_native_draw_mass(db, tmp_path):
    _seed_soccer_1x2_history(db, n_games=72)
    out_dir = str(tmp_path / "models")
    summary = train_and_save(
        db, out_dir, test_frac=0.2, min_games=10, min_publish_holdout_per_league_group=5, force=True
    )
    soccer = summary["groups"]["soccer"]
    assert soccer["games"] == 72
    assert soccer["model_kind"] == MODEL_KIND_SOCCER_1X2
    soccer_dir = tmp_path / "models" / "soccer"
    assert (soccer_dir / ARTIFACT_MODEL).exists()
    assert soccer["outcome_counts"]["draw"] > 0

    even_features = {
        "home_team_win_rate": 0.5,
        "away_team_win_rate": 0.5,
        "home_team_avg_score": 1.5,
        "away_team_avg_score": 1.5,
        "home_team_recent_form": 0.5,
        "away_team_recent_form": 0.5,
        "home_advantage": 0.04,
        "rest_days_home": 4,
        "rest_days_away": 4,
    }
    out = predict_from_artifacts(str(soccer_dir), even_features)
    assert out is not None
    assert out.get("native_1x2") is True
    assert out["model_version"] == "sklearn_soccer_1x2"
    hp = float(out["home_win_probability"])
    ap = float(out["away_win_probability"])
    assert hp + ap < 1.0
    assert 1.0 - hp - ap > 0.05


def test_train_and_save_learns_signal_and_roundtrips(db, tmp_path):
    _seed_separable_nfl_history(db, n_games=60)
    out_dir = str(tmp_path / "models")

    summary = train_and_save(
        db, out_dir, test_frac=0.2, min_games=10, min_publish_holdout_per_league_group=5, force=True
    )

    football = summary["groups"]["football"]
    assert football["games"] == 60
    football_dir = tmp_path / "models" / "football"
    assert (football_dir / ARTIFACT_MODEL).exists()
    assert (football_dir / ARTIFACT_FEATURES).exists()
    assert football["eval"]["accuracy"] >= 0.8
    assert football["eval"]["brier"] <= football["eval"]["baseline_brier"] + 1e-9

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
    out = predict_from_artifacts(str(football_dir), strong_home)
    assert out is not None
    assert out["model_version"] == "sklearn_football"
    assert out["home_win_probability"] > 0.6


def test_train_and_save_aborts_on_tiny_dataset(db):
    _seed_separable_nfl_history(db, n_games=6)
    try:
        train_and_save(db, "/tmp/should_not_write", min_games=60, force=False)
        assert False, "expected ValueError for tiny dataset"
    except ValueError as e:
        assert "min_games" in str(e)


def test_assess_publish_readiness_blocks_small_corpus():
    leagues = ["nfl"] * 60
    ready, reasons, corpus, holdout = assess_publish_readiness(
        leagues, n=60, test_frac=0.2, min_holdout_per_group=500
    )
    assert ready is False
    assert reasons
    assert "corpus has 60" in reasons[0]
    assert corpus["football"] == 60
    assert holdout["football"] == 12


def test_assess_publish_readiness_passes_when_corpus_meets_threshold():
    leagues = ["nba"] * 600
    ready, reasons, corpus, holdout = assess_publish_readiness(
        leagues, n=600, test_frac=0.2, min_holdout_per_group=500
    )
    assert ready is True
    assert not reasons
    assert corpus["basketball"] == 600
    assert holdout["basketball"] == 120


def test_publish_corpus_min_football_lower_than_default():
    assert publish_corpus_min_for_group("football", default=500, football_min=275) == 275
    assert publish_corpus_min_for_group("basketball", default=500, football_min=275) == 500


def test_football_publishes_at_single_season_corpus(db, tmp_path):
    _seed_separable_nfl_history(db, n_games=300)
    out_dir = str(tmp_path / "models")
    summary = train_and_save(
        db,
        out_dir,
        test_frac=0.2,
        min_games=10,
        min_publish_holdout_per_league_group=500,
        force=False,
    )
    football = summary["groups"]["football"]
    assert football["publish_ready"] is True
    assert football["min_publish_corpus_required"] == 275
    assert (tmp_path / "models" / "football" / ARTIFACT_MODEL).exists()


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
    assert not (tmp_path / "models" / "football" / ARTIFACT_MODEL).exists()
    assert (tmp_path / "models" / "metrics.json").exists()


def test_artifacts_publish_ready_requires_metrics_flag(tmp_path):
    out_dir = tmp_path / "models"
    out_dir.mkdir()
    assert artifacts_publish_ready(str(out_dir)) is False
    (out_dir / "metrics.json").write_text('{"publish_ready": false}', encoding="utf-8")
    assert artifacts_publish_ready(str(out_dir)) is False
    (out_dir / "metrics.json").write_text('{"publish_ready": true}', encoding="utf-8")
    assert artifacts_publish_ready(str(out_dir)) is True


def test_train_force_writes_pkls_but_publish_ready_stays_false(db, tmp_path):
    _seed_separable_nfl_history(db, n_games=60)
    out_dir = str(tmp_path / "models")
    summary = train_and_save(
        db,
        out_dir,
        test_frac=0.2,
        min_games=10,
        min_publish_holdout_per_league_group=500,
        force=True,
    )
    football = summary["groups"]["football"]
    assert football["publish_ready"] is False
    assert (tmp_path / "models" / "football" / ARTIFACT_MODEL).exists()
    assert artifacts_publish_ready(str(tmp_path / "models" / "football")) is False
