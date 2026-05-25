"""
ClearSports API (https://api.clearsportsapi.com). Auth: Authorization: Bearer <API_KEY>.

This is not compatible with Sportradar paths or season ids (sr:season:...). Existing sync/standings
code still uses SPORTRADAR_* settings until migrated.
"""
from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

logger = logging.getLogger(__name__)


def clearsports_get_json(
    base_url: str,
    api_key: str,
    path: str,
    query: dict[str, str] | None = None,
    timeout: int = 20,
) -> tuple[Any | None, int | None, str | None]:
    key = (api_key or "").strip()
    if not key:
        return None, None, "CLEARSPORTS_API_KEY not set"
    base = (base_url or "https://api.clearsportsapi.com").rstrip("/")
    if not path.startswith("/"):
        path = "/" + path
    if not path.startswith("/api/"):
        path = "/api" + path
    q = urllib.parse.urlencode(query or {})
    url = f"{base}{path}" + (f"?{q}" if q else "")
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        },
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            code = resp.getcode()
            if code != 200:
                return None, code, body[:500]
            return json.loads(body), code, None
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:500]
        return None, e.code, err_body
    except OSError as e:
        logger.warning("clearsports request failed: %s", e)
        return None, None, str(e)


def clearsports_health_probe(settings: Any) -> dict[str, Any]:
    """Light probe: today's NBA schedule (documented public example)."""
    key = (getattr(settings, "clearsports_api_key", "") or "").strip()
    base = (getattr(settings, "clearsports_api_base_url", "") or "https://api.clearsportsapi.com").strip()
    if not key:
        return {
            "clearsports_configured": False,
            "clearsports_ok": False,
            "detail": "CLEARSPORTS_API_KEY not set",
        }
    from datetime import datetime, timezone

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    data, code, err = clearsports_get_json(base, key, "/v1/epl/games", {"date": today})
    if data is not None and code == 200:
        n = 0
        if isinstance(data, dict) and isinstance(data.get("data"), list):
            n = len(data["data"])
        return {
            "clearsports_configured": True,
            "clearsports_ok": True,
            "clearsports_http_status": code,
            "sample_epl_games_count": n,
            "clearsports_base_url": base,
        }
    return {
        "clearsports_configured": True,
        "clearsports_ok": False,
        "clearsports_http_status": code,
        "error": (err or "unknown")[:300],
        "clearsports_base_url": base,
    }
