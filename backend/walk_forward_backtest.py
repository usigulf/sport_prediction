#!/usr/bin/env python
"""
Walk-forward backtest: train on past games, score the next window, repeat.

Usage (from backend/ or inside Docker where WORKDIR=/app):
    python walk_forward_backtest.py
    python walk_forward_backtest.py --min-train 40 --test-window 10 --group football
    python walk_forward_backtest.py --out /tmp/backtest.json
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import app.models.user  # noqa: F401,E402
import app.models.team  # noqa: F401,E402
import app.models.game  # noqa: F401,E402
import app.models.prediction  # noqa: F401,E402
import app.models.team_standing  # noqa: F401,E402

from app.database import SessionLocal  # noqa: E402
from app.services.walk_forward_backtest import run_walk_forward_backtest  # noqa: E402


def main() -> int:
    ap = argparse.ArgumentParser(description="Walk-forward ML backtest from finished games.")
    ap.add_argument("--min-train", type=int, default=60, help="Minimum training games before first fold.")
    ap.add_argument("--test-window", type=int, default=20, help="Games scored per held-out fold.")
    ap.add_argument(
        "--group",
        action="append",
        dest="groups",
        choices=["basketball", "football", "soccer"],
        help="Limit to one or more league groups (repeat flag). Default: all.",
    )
    ap.add_argument("--out", default=None, help="Optional path to write JSON report.")
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    db = SessionLocal()
    try:
        report = run_walk_forward_backtest(
            db,
            min_train_games=args.min_train,
            test_window_games=args.test_window,
            groups=args.groups,
        )
    finally:
        db.close()

    text = json.dumps(report, indent=2, default=str)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
            f.write("\n")
        print(f"Wrote report to {args.out}")
    else:
        print(text)

    mb = report.get("market_benchmark") or {}
    if mb.get("live_endpoint"):
        print(
            "\nLive model-vs-market benchmark (upcoming games): "
            f"GET {mb['live_endpoint']} — see web/model-vs-market.html",
            file=sys.stderr,
        )

    any_ok = any(
        (info.get("status") == "ok")
        for info in (report.get("groups") or {}).values()
        if isinstance(info, dict)
    )
    return 0 if any_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
