"""P5-002: Live WebSocket pub/sub hub and broadcast refactor."""
import asyncio
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.live_websocket_hub import LiveWebSocketHub, REDIS_CHANNEL_PREFIX

REPO_ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.asyncio
async def test_hub_broadcasts_one_poll_to_multiple_subscribers():
    hub = LiveWebSocketHub()
    game_id = "game-abc"
    sample = {"type": "update", "game_id": game_id, "home_score": 7, "game_status": "live"}

    with patch(
        "app.services.live_websocket_hub.build_live_update_message",
        return_value=sample,
    ):
        q1 = await hub.subscribe(game_id)
        q2 = await hub.subscribe(game_id)

        assert q1.get_nowait() == sample
        assert q2.get_nowait() == sample

        await hub._broadcast_local(game_id, sample)
        assert q1.get_nowait() == sample
        assert q2.get_nowait() == sample

        await hub.unsubscribe(game_id, q1)
        await hub.unsubscribe(game_id, q2)


@pytest.mark.asyncio
async def test_hub_stops_poller_when_last_subscriber_leaves():
    hub = LiveWebSocketHub()
    game_id = "game-stop"
    sample = {"type": "update", "game_id": game_id, "game_status": "scheduled"}

    with patch(
        "app.services.live_websocket_hub.build_live_update_message",
        return_value=sample,
    ):
        queue = await hub.subscribe(game_id)
        queue.get_nowait()
        assert game_id in hub._poll_tasks
        await hub.unsubscribe(game_id, queue)
        await asyncio.sleep(0)
        assert game_id not in hub._poll_tasks


def test_main_websocket_uses_pubsub_hub():
    main_src = (REPO_ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
    handler = main_src.split("async def websocket_live_updates")[1].split("@app.")[0]
    assert "live_ws_hub.subscribe" in handler
    assert "live_ws_hub.unsubscribe" in handler
    assert "while True:" not in handler or "queue.get()" in handler
    assert "PredictionService" not in handler


def test_live_websocket_hub_has_redis_bridge():
    hub_src = (REPO_ROOT / "backend" / "app" / "services" / "live_websocket_hub.py").read_text(
        encoding="utf-8"
    )
    assert REDIS_CHANNEL_PREFIX in hub_src
    assert "_redis_listener_loop" in hub_src
    assert "_poll_game" in hub_src
    assert "asyncio.Queue" in hub_src


def test_live_update_broadcast_module_exists():
    path = REPO_ROOT / "backend" / "app" / "services" / "live_update_broadcast.py"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "build_live_update_message" in text


def test_lifespan_starts_live_ws_hub():
    main_src = (REPO_ROOT / "backend" / "app" / "main.py").read_text(encoding="utf-8")
    assert "live_ws_hub.start()" in main_src
    assert "live_ws_hub.stop()" in main_src
