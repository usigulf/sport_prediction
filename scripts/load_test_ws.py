#!/usr/bin/env python3
"""WebSocket join load probe (audit #18). Prefer staging."""
from __future__ import annotations

import argparse
import asyncio
import os
import statistics
import sys
import time


def _parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Concurrent /ws/live join probe")
    p.add_argument("--dry-run", action="store_true", default=os.getenv("DRY_RUN") == "1")
    p.add_argument("--api-url", default=os.getenv("API_URL", "http://127.0.0.1:8001"))
    p.add_argument("--game-id", default=os.getenv("GAME_ID", ""))
    p.add_argument("--clients", type=int, default=int(os.getenv("WS_CLIENTS", "5")))
    p.add_argument("--timeout", type=float, default=float(os.getenv("WS_TIMEOUT", "5")))
    p.add_argument("--token", default=os.getenv("WS_TOKEN", ""))
    return p.parse_args()


def _ws_url(api_url: str, game_id: str, token: str) -> str:
    base = api_url.rstrip("/")
    if base.startswith("https://"):
        ws = "wss://" + base[len("https://") :]
    elif base.startswith("http://"):
        ws = "ws://" + base[len("http://") :]
    else:
        ws = base
    url = f"{ws}/ws/live/{game_id}"
    if token:
        url += f"?token={token}"
    return url


async def _one(url: str, timeout: float) -> float:
    try:
        import websockets  # type: ignore
    except ImportError as exc:  # pragma: no cover
        raise SystemExit(
            "websockets package required — pip install websockets "
            "or use the backend venv"
        ) from exc

    t0 = time.perf_counter()
    async with websockets.connect(url, open_timeout=timeout, close_timeout=2) as ws:
        await asyncio.wait_for(ws.recv(), timeout=timeout)
    return (time.perf_counter() - t0) * 1000.0


async def _run(args: argparse.Namespace) -> int:
    if args.dry_run:
        print(
            f"[load-ws] DRY_RUN: would open {args.clients} clients to "
            f"{args.api_url}/ws/live/{{game_id}} timeout={args.timeout}s"
        )
        return 0

    if not args.game_id:
        print("[load-ws] FAIL: set GAME_ID=<uuid> (or --game-id)", file=sys.stderr)
        return 1

    url = _ws_url(args.api_url, args.game_id, args.token)
    print(f"[load-ws] url={url} clients={args.clients}")

    results = await asyncio.gather(
        *[_one(url, args.timeout) for _ in range(args.clients)],
        return_exceptions=True,
    )
    ok_ms = [r for r in results if isinstance(r, float)]
    errs = [r for r in results if not isinstance(r, float)]
    if not ok_ms:
        print(f"[load-ws] FAIL: all {len(errs)} clients failed: {errs[0]!r}", file=sys.stderr)
        return 1

    p95 = sorted(ok_ms)[max(0, int(len(ok_ms) * 0.95) - 1)]
    print(
        f"[load-ws] ok={len(ok_ms)} fail={len(errs)} "
        f"avg_ms={statistics.mean(ok_ms):.0f} p95_ms={p95:.0f}"
    )
    if len(errs) / max(1, len(results)) > 0.2:
        print("[load-ws] FAIL: error rate > 20%", file=sys.stderr)
        return 1
    if p95 > 5000:
        print(f"[load-ws] FAIL: p95 {p95:.0f}ms > 5000ms soft gate", file=sys.stderr)
        return 1
    print("[load-ws] Done.")
    return 0


def main() -> None:
    args = _parse_args()
    raise SystemExit(asyncio.run(_run(args)))


if __name__ == "__main__":
    main()
