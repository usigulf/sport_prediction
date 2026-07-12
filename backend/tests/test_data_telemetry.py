"""Data lineage / freshness / provider-error telemetry (audit #13)."""
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.models.game import Game
from app.models.game_feature_snapshot import GameFeatureSnapshot
from app.models.odds_snapshot import OddsSnapshot
from app.models.prediction import Prediction
from app.models.provider_sync_event import ProviderSyncEvent
from app.models.team_standing import TeamStanding
from app.services.data_telemetry_service import (
    build_data_telemetry_summary,
    build_game_lineage,
    feature_coverage_from_snapshots,
    record_provider_sync_event,
)
from app.services.model_training import FEATURE_COLUMNS


def test_record_provider_sync_event_persists_error(db):
    ev = record_provider_sync_event(
        db,
        provider="clearsports",
        job="soccer_standings",
        league="premier_league",
        ok=False,
        errors=["CLEARSPORTS_API_KEY not set"],
        rows_touched=0,
    )
    assert ev.id is not None
    assert ev.error_code == "missing_credentials"
    assert db.query(ProviderSyncEvent).count() == 1


def test_feature_coverage_reports_expected_columns(db, test_teams):
    g = Game(
        id=uuid4(),
        league="premier_league",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) + timedelta(days=1),
        status="scheduled",
    )
    db.add(g)
    db.flush()
    feats = {c: 0.5 for c in FEATURE_COLUMNS}
    feats.pop("rest_days_away")
    db.add(
        GameFeatureSnapshot(
            id=uuid4(),
            game_id=g.id,
            captured_at=datetime.now(timezone.utc),
            feature_source="heuristic",
            model_version="test",
            features_json=__import__("json").dumps(feats),
        )
    )
    db.commit()
    cov = feature_coverage_from_snapshots(db, sample_limit=10)
    assert cov["sample_size"] == 1
    assert cov["mean_coverage_pct"] is not None
    assert cov["mean_coverage_pct"] < 100.0
    assert cov["per_feature_present_pct"]["rest_days_away"] == 0.0
    assert cov["per_feature_present_pct"]["home_advantage"] == 100.0


def test_data_telemetry_summary_endpoint(client, db, test_teams):
    db.add(
        TeamStanding(
            id=uuid4(),
            league="premier_league",
            team_id=test_teams[0].id,
            league_rank=1,
            played=10,
            wins=6,
            draws=2,
            losses=2,
            goals_for=18,
            goals_against=10,
            points=20,
            updated_at=datetime.now(timezone.utc),
        )
    )
    record_provider_sync_event(
        db,
        provider="sportradar",
        job="soccer_schedule",
        league="premier_league",
        ok=True,
        rows_touched=12,
    )
    res = client.get("/api/v1/stats/data-telemetry")
    assert res.status_code == 200
    body = res.json()
    assert body["audit_task"] == 13
    assert "freshness" in body
    assert "feature_coverage" in body
    assert body["provider_sync"]["total_events"] >= 1
    assert any(r["resource"] == "team_standings" for r in body["freshness"]["resources"])


def test_game_lineage_and_replay(client, db, test_teams):
    gid = uuid4()
    g = Game(
        id=gid,
        league="premier_league",
        home_team_id=test_teams[0].id,
        away_team_id=test_teams[1].id,
        scheduled_time=datetime.now(timezone.utc) + timedelta(hours=6),
        status="scheduled",
    )
    db.add(g)
    db.flush()
    pred = Prediction(
        id=uuid4(),
        game_id=gid,
        model_version="v-test",
        home_win_probability=0.55,
        away_win_probability=0.25,
        confidence_level="medium",
        created_at=datetime.now(timezone.utc),
    )
    db.add(pred)
    db.flush()
    feats = {c: 0.4 for c in FEATURE_COLUMNS}
    db.add(
        GameFeatureSnapshot(
            id=uuid4(),
            game_id=gid,
            prediction_id=pred.id,
            captured_at=datetime.now(timezone.utc),
            feature_source="heuristic",
            model_version="v-test",
            features_json=__import__("json").dumps(feats),
        )
    )
    db.add(
        OddsSnapshot(
            id=uuid4(),
            game_id=gid,
            captured_at=datetime.now(timezone.utc) - timedelta(minutes=30),
            provider="test",
            home_implied_prob=0.52,
            away_implied_prob=0.28,
        )
    )
    db.commit()

    lineage = build_game_lineage(db, gid)
    assert lineage["found"] is True
    kinds = {e["kind"] for e in lineage["timeline"]}
    assert "odds_snapshot" in kinds
    assert "feature_snapshot" in kinds
    assert "prediction" in kinds
    assert lineage["replay"] is not None
    assert lineage["replay"]["features"]["home_advantage"] == 0.4

    res = client.get(f"/api/v1/games/{gid}/lineage")
    assert res.status_code == 200
    assert res.json()["counts"]["predictions"] == 1


def test_build_summary_marks_missing_resources_stale(db):
    summary = build_data_telemetry_summary(db)
    assert summary["freshness"]["any_stale"] is True
    assert summary["feature_coverage"]["sample_size"] == 0
