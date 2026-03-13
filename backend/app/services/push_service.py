"""
Send push notifications via Expo Push API.
Used when we have user push tokens (e.g. "game starting in 1 hour" for favorites).
"""
import json
import logging
import urllib.request
from typing import List, Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


def send_expo_push(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> None:
    """
    Send a push notification to Expo push tokens.
    tokens: list of ExponentPushToken[...]
    """
    if not tokens:
        return
    payload = [
        {
            "to": t,
            "title": title,
            "body": body,
            "sound": "default",
            **({"data": data} if data else {}),
        }
        for t in tokens
    ]
    try:
        req = urllib.request.Request(
            EXPO_PUSH_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            if r.status != 200:
                logger.warning("Expo push send failed: %s", r.status)
    except Exception as e:
        logger.warning("Expo push send error: %s", e)
