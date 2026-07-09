"""Historical PIT feature persistence (I91)."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.models.game import Game
from app.models.game_feature_snapshot import GameFeatureSnapshot


def record_feature_snapshot(
    db: Session,
    *,
    game: Game,
    features: dict[str, float | int],
    feature_source: str,
    model_version: str | None = None,
    prediction_id: UUID | None = None,
) -> GameFeatureSnapshot:
    snap = GameFeatureSnapshot(
        game_id=game.id,
        prediction_id=prediction_id,
        captured_at=datetime.now(timezone.utc),
        feature_source=feature_source,
        model_version=model_version,
        features_json=json.dumps(features, sort_keys=True),
    )
    db.add(snap)
    db.commit()
    db.refresh(snap)
    return snap


def feature_history_for_game(db: Session, game_id: UUID, *, limit: int = 20) -> dict[str, Any]:
    rows = (
        db.query(GameFeatureSnapshot)
        .filter(GameFeatureSnapshot.game_id == game_id)
        .order_by(desc(GameFeatureSnapshot.captured_at))
        .limit(limit)
        .all()
    )
    snapshots = []
    for row in rows:
        try:
            feats = json.loads(row.features_json)
        except (TypeError, ValueError):
            feats = {}
        captured = row.captured_at
        if captured and captured.tzinfo is None:
            captured = captured.replace(tzinfo=timezone.utc)
        snapshots.append(
            {
                "captured_at_iso": captured.isoformat() if captured else None,
                "feature_source": row.feature_source,
                "model_version": row.model_version,
                "feature_count": len(feats) if isinstance(feats, dict) else 0,
                "features": feats,
            }
        )
    return {
        "game_id": str(game_id),
        "snapshot_count": len(snapshots),
        "snapshots": snapshots,
    }


def feature_store_summary(db: Session) -> dict[str, Any]:
    total = db.query(func.count(GameFeatureSnapshot.id)).scalar() or 0
    latest = db.query(func.max(GameFeatureSnapshot.captured_at)).scalar()
    by_source = (
        db.query(GameFeatureSnapshot.feature_source, func.count(GameFeatureSnapshot.id))
        .group_by(GameFeatureSnapshot.feature_source)
        .all()
    )
    latest_iso = None
    if latest:
        if latest.tzinfo is None:
            latest = latest.replace(tzinfo=timezone.utc)
        latest_iso = latest.isoformat()
    return {
        "total_snapshots": int(total),
        "latest_captured_at_iso": latest_iso,
        "by_feature_source": {src: int(cnt) for src, cnt in by_source},
        "note": "Snapshots recorded on each pre-game prediction job write.",
    }
