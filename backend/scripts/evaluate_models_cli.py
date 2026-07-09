#!/usr/bin/env python3
"""CLI wrapper for Makefile `ml-evaluate` (Weakness #49)."""
from __future__ import annotations

import json
import sys

from app.database import SessionLocal
from app.services.walk_forward_backtest import run_walk_forward_backtest


def main() -> int:
    db = SessionLocal()
    try:
        report = run_walk_forward_backtest(db, groups=["nfl"])
        print(json.dumps(report, indent=2, default=str))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
