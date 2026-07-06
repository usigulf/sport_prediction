"""WebSocket auth helpers for /ws/live."""
from __future__ import annotations

from typing import Optional, Tuple
from uuid import UUID

from fastapi import WebSocket
from sqlalchemy.orm import Session

from app.core.security import verify_access_token
from app.models.user import User
from app.utils.subscription_tiers import has_paid_access


def get_ws_token(websocket: WebSocket) -> Optional[str]:
    """
    JWT for WebSocket auth: Authorization Bearer header (native clients) or
    Sec-WebSocket-Protocol `bearer.<jwt>` (browser clients — no query tokens).
    """
    auth = websocket.headers.get("authorization") or websocket.headers.get("Authorization")
    if auth:
        auth = auth.strip()
        if auth.lower().startswith("bearer "):
            return auth[7:].strip()
        return auth or None

    subprotocols = websocket.scope.get("subprotocols") or []
    for proto in subprotocols:
        raw = (proto or "").strip()
        if raw.lower().startswith("bearer."):
            token = raw[7:].strip()
            if token:
                return token
    return None


async def _reject(websocket: WebSocket, *, message: str, reason: str) -> None:
    await websocket.send_json({"error": message})
    await websocket.close(code=1008, reason=reason)


async def authenticate_live_websocket(
    websocket: WebSocket,
    db: Session,
    game_id: str,
) -> Optional[Tuple[UUID, User]]:
    """
    Validate game id, JWT, and premium access. Sends WS errors and returns None on failure.
    """
    game_id_str = str(game_id).strip()
    if not game_id_str:
        await _reject(websocket, message="Missing game id in path", reason="Missing game id")
        return None
    try:
        game_uuid = UUID(game_id_str)
    except ValueError:
        await _reject(websocket, message="Invalid game id", reason="Invalid game id")
        return None

    token = get_ws_token(websocket)
    if not token:
        await _reject(
            websocket,
            message="Missing token. Send Authorization: Bearer <access_token> or Sec-WebSocket-Protocol bearer.<jwt>.",
            reason="Missing token — use Authorization header or bearer.<jwt> subprotocol",
        )
        return None

    payload = verify_access_token(token)
    if not payload:
        await _reject(websocket, message="Invalid or expired token", reason="Invalid or expired token")
        return None

    user_id_raw = payload.get("user_id")
    if not user_id_raw:
        await _reject(websocket, message="Invalid token payload", reason="Invalid token payload")
        return None
    try:
        user_uuid = UUID(str(user_id_raw))
    except ValueError:
        await _reject(websocket, message="Invalid user in token", reason="Invalid user in token")
        return None

    user = db.query(User).filter(User.id == user_uuid).first()
    if not user:
        await _reject(websocket, message="User not found", reason="User not found")
        return None
    if not has_paid_access(user.subscription_tier):
        await _reject(
            websocket,
            message="Premium subscription required for live updates",
            reason="Premium subscription required for live updates",
        )
        return None

    return game_uuid, user
