#!/usr/bin/env python3
"""
Bulk PUT game player spotlights via the internal API (same auth as cron).

JSON file: top-level object mapping game_id (UUID string) -> array of spotlight objects:

  {
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": [
      {
        "player_name": "Jane Doe",
        "team_name": "Home Town FC",
        "role": "Forward",
        "summary": "Form / injury / usage notes for the app.",
        "sort_order": 0
      }
    ]
  }

Required env:
  PUSH_CRON_SECRET
Optional:
  API_URL (default http://localhost:8000)

Usage:
  export API_URL=https://api.example.com
  export PUSH_CRON_SECRET=your-secret
  python3 scripts/sync_player_spotlights.py path/to/spotlights.json

  # Print requests only:
  python3 scripts/sync_player_spotlights.py path/to/spotlights.json --dry-run
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def put_spotlights(
    base: str,
    secret: str,
    game_id: str,
    spotlights: list,
    dry_run: bool,
) -> tuple[int, dict | None]:
    payload = json.dumps({"spotlights": spotlights}).encode("utf-8")
    url = f"{base}/internal/games/{game_id}/player-spotlights"
    if dry_run:
        print(f"DRY-RUN PUT {url} ({len(spotlights)} row(s))")
        return 0, None
    req = urllib.request.Request(
        url,
        data=payload,
        method="PUT",
        headers={
            "Content-Type": "application/json",
            "X-Cron-Secret": secret,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"HTTP {e.code} for game {game_id}: {body}", file=sys.stderr)
        return e.code, None


def main() -> int:
    args = [a for a in sys.argv[1:] if a != "--dry-run"]
    dry_run = "--dry-run" in sys.argv[1:]
    if len(args) != 1:
        print(
            "Usage: python3 scripts/sync_player_spotlights.py <spotlights.json> [--dry-run]",
            file=sys.stderr,
        )
        return 2

    path = args[0]
    if not os.path.isfile(path):
        print(f"File not found: {path}", file=sys.stderr)
        return 2

    base = os.environ.get("API_URL", "http://localhost:8000").rstrip("/")
    secret = os.environ.get("PUSH_CRON_SECRET")
    if not secret and not dry_run:
        print("PUSH_CRON_SECRET is required (unless --dry-run)", file=sys.stderr)
        return 1

    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict):
        print("JSON root must be an object: { game_id: [ spotlights... ] }", file=sys.stderr)
        return 2

    exit_code = 0
    for game_id, spotlights in data.items():
        if not isinstance(spotlights, list):
            print(f"Skip {game_id}: value must be a list", file=sys.stderr)
            exit_code = max(exit_code, 3)
            continue
        bad = False
        for i, row in enumerate(spotlights):
            if not isinstance(row, dict):
                print(f"Skip {game_id}[{i}]: not an object", file=sys.stderr)
                bad = True
                break
            if "player_name" not in row or "team_name" not in row or "summary" not in row:
                print(
                    f"Skip {game_id}[{i}]: need player_name, team_name, summary",
                    file=sys.stderr,
                )
                bad = True
                break
        if bad:
            exit_code = max(exit_code, 3)
            continue
        code, out = put_spotlights(base, secret or "", game_id, spotlights, dry_run)
        if code >= 400:
            exit_code = 1
        elif out is not None:
            print(json.dumps({"game_id": game_id, **out}))

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
