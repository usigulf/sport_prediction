"""Explainability uses per-league artifact dirs and logistic coefficients."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.models.game import Game
from app.models.team import Team
from app.models.team_standing import TeamStanding
from app.services.explanation_service import (
    extract_calibrated_feature_weights,
    get_model_feature_importance,
    resolve_explanation_model_dir,
)
from app.services.model_training import train_and_save


def _seed_nfl(db, n: int = 60):
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
    for i in range(n):
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


def test_extract_calibrated_feature_weights_from_pipeline():
    pipe = Pipeline(
        [
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=200)),
        ]
    )
    X = np.array([[0.8, 0.2], [0.7, 0.3], [0.2, 0.8], [0.3, 0.7]] * 5)
    y = np.array([1, 1, 0, 0] * 5)
    pipe.fit(X, y)
    cal = CalibratedClassifierCV(pipe, method="sigmoid", cv=2)
    cal.fit(X, y)
    weights = extract_calibrated_feature_weights(cal)
    assert weights is not None
    assert len(weights) == 2
    assert all(w >= 0 for w in weights)


def test_resolve_explanation_model_dir_per_league_group(db, tmp_path):
    _seed_nfl(db, n=300)
    out_dir = str(tmp_path / "models")
    train_and_save(
        db,
        out_dir,
        test_frac=0.2,
        min_games=10,
        min_publish_holdout_per_league_group=500,
        force=False,
    )
    football_dir = resolve_explanation_model_dir(out_dir, "nfl")
    assert football_dir is not None
    assert football_dir.endswith("/football") or football_dir.endswith("\\football")
    assert resolve_explanation_model_dir(out_dir, "premier_league") is None


def test_get_model_feature_importance_uses_calibrated_coefs(db, tmp_path):
    _seed_nfl(db, n=300)
    out_dir = str(tmp_path / "models")
    train_and_save(
        db,
        out_dir,
        test_frac=0.2,
        min_games=10,
        min_publish_holdout_per_league_group=500,
        force=False,
    )
    factors = get_model_feature_importance(None, league="nfl", base_model_dir=out_dir)
    assert factors is not None
    assert len(factors) >= 5
    assert all("feature_weight" in f for f in factors)
    assert all(abs(f["feature_weight"]) >= 0 for f in factors)
    assert "shap" not in factors[0]["description"].lower()
