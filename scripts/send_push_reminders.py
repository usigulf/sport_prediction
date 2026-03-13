#!/usr/bin/env python3
"""
Run push triggers: game-starting-in-1h and high-confidence-pick notifications.
Call from cron every 10–15 minutes, e.g.:
  */15 * * * * cd /path/to/sport_prediction && PYTHONPATH=backend backend/.venv/bin/python scripts/send_push_reminders.py
"""
import os
import sys

# Ensure backend is on path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app.database import SessionLocal, init_sqlite_tables
from app.services.push_trigger_service import send_game_starting_reminders, send_high_confidence_picks


def main():
    init_sqlite_tables()
    db = SessionLocal()
    try:
        n1 = send_game_starting_reminders(db)
        n2 = send_high_confidence_picks(db)
        print(f"Sent {n1} game reminders, {n2} high-confidence pick notifications")
    finally:
        db.close()


if __name__ == "__main__":
    main()
