#!/usr/bin/env python
"""
Train the win-probability model from finished games in the database and write
simple_model.pkl / feature_columns.pkl / metrics.json.

Usage (from backend/ or inside Docker where WORKDIR=/app):
    python train_model.py                      # writes to configured model dir
    python train_model.py --out /models        # explicit output dir (Docker: use /model-out — see below)
    python train_model.py --force              # train even on a small dataset

After it writes artifacts, point inference at the dir and restart the API:
    MODEL_ARTIFACT_DIR=/abs/path/to/models   (or EXPLANATION_MODEL_DIR)

Note: repo-root scripts/ is mounted at /app/scripts in docker-compose (cron
shell scripts only). This file lives at /app/train_model.py so it is not hidden.
In Docker, write artifacts to /model-out (rw bind mount), not /models (:ro).
Use `docker compose run --user root` so the non-root api user (uid 1000) can
write into the host-mounted output directory.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys

# Make `app` importable when run as a plain file from backend/.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Register all ORM models so SQLAlchemy relationships resolve.
import app.models.user  # noqa: F401,E402
import app.models.team  # noqa: F401,E402
import app.models.game  # noqa: F401,E402
import app.models.prediction  # noqa: F401,E402
import app.models.team_standing  # noqa: F401,E402

from app.config import get_settings  # noqa: E402
from app.database import SessionLocal  # noqa: E402
from app.services.model_training import train_and_save  # noqa: E402


def _default_out_dir() -> str:
    s = get_settings()
    configured = s.model_artifact_dir or s.explanation_model_dir
    if configured and configured.strip():
        return configured.strip()
    # Repo default: ml/models (docker-compose mounts this read-only at /models).
    backend_root = os.path.dirname(os.path.abspath(__file__))
    return os.path.abspath(os.path.join(backend_root, "..", "ml", "models"))


def main() -> int:
    ap = argparse.ArgumentParser(description="Train the win-probability model.")
    ap.add_argument("--out", default=None, help="Output dir for artifacts (default: configured model dir).")
    ap.add_argument("--test-frac", type=float, default=0.2, help="Fraction of latest games held out for evaluation.")
    ap.add_argument("--min-games", type=int, default=60, help="Minimum usable games before training (unless --force).")
    ap.add_argument("--force", action="store_true", help="Train even if the dataset is below --min-games.")
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    out_dir = args.out or _default_out_dir()

    db = SessionLocal()
    try:
        summary = train_and_save(
            db,
            out_dir,
            test_frac=args.test_frac,
            min_games=args.min_games,
            force=args.force,
        )
    except ValueError as e:
        print(f"Training aborted: {e}", file=sys.stderr)
        return 2
    finally:
        db.close()

    print(json.dumps(summary, indent=2, default=str))
    print(f"\nGames trained on: {summary.get('games', 0)}")
    if summary.get("mode") == "per_league_group":
        for group, info in (summary.get("groups") or {}).items():
            if not isinstance(info, dict):
                continue
            ev = info.get("eval") or {}
            status = info.get("status", "?")
            ready = info.get("publish_ready", False)
            print(
                f"  {group}: {info.get('games', 0)} games | status={status} | "
                f"publish_ready={ready}"
                + (f" | holdout accuracy={ev['accuracy']:.3f}" if ev.get("accuracy") is not None else "")
            )
    else:
        ev = summary.get("eval") or {}
        if summary.get("home_win_rate") is not None:
            print(f"Home-win rate: {summary['home_win_rate']:.3f}")
        if ev:
            print(
                f"Holdout — accuracy: {ev['accuracy']:.3f} | log_loss: {ev['log_loss']:.3f} | "
                f"brier: {ev['brier']:.3f} (constant-baseline brier: {ev['baseline_brier']:.3f})"
            )
    print(f"Artifacts: {summary['out_dir']}")
    print(f"Enable: set MODEL_ARTIFACT_DIR={summary['out_dir']} and restart the API.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
