"""Job queue worker and WebSocket hub poller tests."""
import asyncio

from app.services.job_queue_service import complete_job, enqueue_job, fail_job, get_job, pending_job_count
from app.services.job_worker_service import run_next_job


def test_complete_and_fail_job():
    job_id = enqueue_job("noop", {})
    complete_job(job_id, {"ok": True})
    stored = get_job(job_id)
    assert stored["status"] == "completed"
    assert stored["result"]["ok"] is True

    job_id2 = enqueue_job("noop", {})
    fail_job(job_id2, "boom")
    stored2 = get_job(job_id2)
    assert stored2["status"] == "failed"
    assert "boom" in stored2["error"]


def test_run_next_job_noop(db):
    enqueue_job("noop", {"ping": 1})
    assert pending_job_count() >= 1
    result = run_next_job(db)
    assert result is not None
    assert result["status"] == "completed"
    assert result["type"] == "noop"
    stored = get_job(result["job_id"])
    assert stored["status"] == "completed"


def test_run_next_job_unknown_type(db):
    enqueue_job("not_a_real_handler", {})
    result = run_next_job(db)
    assert result["status"] == "failed"
    assert "unknown" in result["error"]


def test_live_websocket_single_poller_per_game():
    async def _run():
        from app.services.live_websocket_hub import LiveWebSocketHub

        hub = LiveWebSocketHub()
        q1 = await hub.subscribe("game-poller-test")
        q2 = await hub.subscribe("game-poller-test")
        assert len(hub._poll_tasks) == 1
        assert len(hub._subscribers["game-poller-test"]) == 2
        await hub.unsubscribe("game-poller-test", q1)
        assert len(hub._poll_tasks) == 1
        await hub.unsubscribe("game-poller-test", q2)
        assert "game-poller-test" not in hub._poll_tasks

    asyncio.run(_run())
