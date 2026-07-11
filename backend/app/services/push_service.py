"""
Send push notifications via Expo Push API.
Used when we have user push tokens (e.g. kickoff alerts ~2h before favorite-team games).
"""
import json
import logging
import urllib.request
from typing import List, Optional

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# iOS notification categories registered in the mobile app (I45).
PUSH_CATEGORY_BY_TYPE: dict[str, str] = {
    "game_reminder": "kickoff",
    "high_confidence": "upset_picks",
    "post_game_result": "results",
    "trial_ending": "account",
}


def category_id_for_push_data(data: Optional[dict]) -> Optional[str]:
    if not data:
        return None
    push_type = data.get("type")
    if not isinstance(push_type, str):
        return None
    return PUSH_CATEGORY_BY_TYPE.get(push_type)


def send_expo_push(
    tokens: List[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
    category_id: Optional[str] = None,
) -> None:
    """
    Send a push notification to Expo push tokens.
    tokens: list of ExponentPushToken[...]
    """
    if not tokens:
        return
    resolved_category = category_id or category_id_for_push_data(data)
    payload = [
        {
            "to": t,
            "title": title,
            "body": body,
            "sound": "default",
            **({"data": data} if data else {}),
            **({"categoryId": resolved_category} if resolved_category else {}),
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
