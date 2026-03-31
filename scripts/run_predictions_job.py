#!/usr/bin/env python3
"""
Call the API internal prediction job (same as cron). Requires PUSH_CRON_SECRET and API_URL.

  export API_URL=http://localhost:8000
  export PUSH_CRON_SECRET=your-secret
  python3 scripts/run_predictions_job.py

Optional JSON body args:
  python3 scripts/run_predictions_job.py '{"force": true, "game_ids": ["uuid-here"]}'
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request


def main() -> int:
    base = os.environ.get("API_URL", "http://localhost:8000").rstrip("/")
    secret = os.environ.get("PUSH_CRON_SECRET")
    if not secret:
        print("PUSH_CRON_SECRET is required", file=sys.stderr)
        return 1
    body: dict = {}
    if len(sys.argv) > 1:
        body = json.loads(sys.argv[1])
    data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        f"{base}/internal/predictions/run",
        data=data,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "X-Cron-Secret": secret,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            out = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(e.read().decode(), file=sys.stderr)
        return e.code
    print(json.dumps(out, indent=2))
    return 0 if not out.get("errors") else 2


if __name__ == "__main__":
    raise SystemExit(main())
