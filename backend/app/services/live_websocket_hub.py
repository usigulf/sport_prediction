"""
In-process pub/sub for live game WebSocket updates.

One poller task per active game fans out to all subscribers on this worker.
When Redis is configured, updates are also published so other API instances can
relay the same payload to their local subscribers.
"""
from __future__ import annotations

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any, Optional

from app.config import get_settings
from app.services.live_update_broadcast import build_live_update_message

logger = logging.getLogger(__name__)

REDIS_CHANNEL_PREFIX = "live:game:"


class WebSocketConnectionLimitError(Exception):
    """Raised when per-game subscriber cap is reached on this worker."""


def _redis_enabled() -> bool:
    url = (get_settings().redis_url or "").strip().lower()
    return url not in ("", "disabled", "false")


class LiveWebSocketHub:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._subscribers: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(set)
        self._poll_tasks: dict[str, asyncio.Task] = {}
        self._redis_pub = None
        self._redis_sub = None
        self._redis_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        if not _redis_enabled():
            return
        try:
            import redis

            settings = get_settings()
            self._redis_pub = redis.from_url(
                settings.redis_url,
                password=settings.redis_password,
                decode_responses=True,
            )
            self._redis_sub = redis.from_url(
                settings.redis_url,
                password=settings.redis_password,
                decode_responses=True,
            )
            self._redis_pub.ping()
            self._redis_task = asyncio.create_task(self._redis_listener_loop())
            logger.info("Live WebSocket hub: Redis pub/sub bridge enabled")
        except Exception as exc:
            logger.warning("Live WebSocket hub: Redis pub/sub disabled (%s)", exc)
            self._redis_pub = None
            self._redis_sub = None

    async def stop(self) -> None:
        if self._redis_task:
            self._redis_task.cancel()
            try:
                await self._redis_task
            except asyncio.CancelledError:
                pass
            self._redis_task = None

        async with self._lock:
            tasks = list(self._poll_tasks.values())
            self._poll_tasks.clear()
            self._subscribers.clear()
        for task in tasks:
            task.cancel()
        for task in tasks:
            try:
                await task
            except asyncio.CancelledError:
                pass

        if self._redis_pub:
            try:
                self._redis_pub.close()
            except Exception:
                pass
            self._redis_pub = None
        if self._redis_sub:
            try:
                self._redis_sub.close()
            except Exception:
                pass
            self._redis_sub = None

    async def subscribe(self, game_id: str) -> asyncio.Queue[dict[str, Any]]:
        settings = get_settings()
        cap = max(1, int(getattr(settings, "websocket_max_connections_per_game", 200) or 200))
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=8)
        initial = await asyncio.to_thread(build_live_update_message, game_id)
        if initial:
            queue.put_nowait(initial)

        async with self._lock:
            current = len(self._subscribers.get(game_id, ()))
            if current >= cap:
                raise WebSocketConnectionLimitError(
                    f"Max {cap} live subscribers per game on this worker"
                )
            self._subscribers[game_id].add(queue)
            if game_id not in self._poll_tasks:
                self._poll_tasks[game_id] = asyncio.create_task(self._poll_game(game_id))
        return queue

    async def unsubscribe(self, game_id: str, queue: asyncio.Queue[dict[str, Any]]) -> None:
        async with self._lock:
            subs = self._subscribers.get(game_id)
            if not subs:
                return
            subs.discard(queue)
            if subs:
                return
            self._subscribers.pop(game_id, None)
            task = self._poll_tasks.pop(game_id, None)

        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    async def _broadcast_local(self, game_id: str, message: dict[str, Any]) -> None:
        async with self._lock:
            targets = list(self._subscribers.get(game_id, ()))
        for queue in targets:
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                queue.put_nowait(message)

    def _publish_redis(self, game_id: str, message: dict[str, Any]) -> None:
        if not self._redis_pub:
            return
        try:
            channel = f"{REDIS_CHANNEL_PREFIX}{game_id}"
            self._redis_pub.publish(channel, json.dumps(message, default=str))
        except Exception as exc:
            logger.warning("Live WebSocket hub: Redis publish failed (%s)", exc)

    async def _poll_game(self, game_id: str) -> None:
        try:
            while True:
                async with self._lock:
                    if not self._subscribers.get(game_id):
                        return

                message = await asyncio.to_thread(build_live_update_message, game_id)
                if not message:
                    await asyncio.sleep(30)
                    continue

                if message.get("type") == "error":
                    await self._broadcast_local(game_id, message)
                    await asyncio.sleep(30)
                    continue

                if self._redis_pub:
                    self._publish_redis(game_id, message)
                else:
                    await self._broadcast_local(game_id, message)

                interval = 12 if message.get("game_status") == "live" else 45
                await asyncio.sleep(interval)
        except asyncio.CancelledError:
            raise

    async def _redis_listener_loop(self) -> None:
        if not self._redis_sub:
            return
        pubsub = self._redis_sub.pubsub(ignore_subscribe_messages=True)
        pubsub.psubscribe(f"{REDIS_CHANNEL_PREFIX}*")
        try:
            while True:
                raw = await asyncio.to_thread(pubsub.get_message, timeout=1.0)
                if not raw or raw.get("type") != "pmessage":
                    continue
                channel = raw.get("channel") or ""
                if isinstance(channel, bytes):
                    channel = channel.decode("utf-8")
                if not channel.startswith(REDIS_CHANNEL_PREFIX):
                    continue
                game_id = channel[len(REDIS_CHANNEL_PREFIX) :]
                data = raw.get("data")
                if isinstance(data, bytes):
                    data = data.decode("utf-8")
                try:
                    message = json.loads(data)
                except (TypeError, json.JSONDecodeError):
                    continue
                await self._broadcast_local(game_id, message)
        except asyncio.CancelledError:
            raise
        finally:
            try:
                pubsub.close()
            except Exception:
                pass


live_ws_hub = LiveWebSocketHub()
