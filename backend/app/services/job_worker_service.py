"""Execute dequeued internal jobs (W42 / I52 cron worker pattern)."""
from __future__ import annotations

import logging
from typing import Any, Callable

from sqlalchemy.orm import Session

from app.services.email_digest_service import run_daily_email_digest
from app.services.job_queue_service import complete_job, dequeue_job, fail_job

logger = logging.getLogger(__name__)

JobHandler = Callable[[Session, dict[str, Any]], Any]


def _handle_noop(_db: Session, _payload: dict[str, Any]) -> dict[str, str]:
    return {"message": "noop ok"}


def _handle_email_digest(db: Session, _payload: dict[str, Any]) -> dict[str, int]:
    sent = run_daily_email_digest(db)
    return {"emails_sent": sent}


JOB_HANDLERS: dict[str, JobHandler] = {
    "noop": _handle_noop,
    "email_digest": _handle_email_digest,
}


def run_next_job(db: Session) -> dict[str, Any] | None:
    """
    Dequeue one job, run its handler, and mark completed or failed.
    Returns summary dict or None when queue is empty.
    """
    job = dequeue_job()
    if not job:
        return None

    job_id = job["id"]
    job_type = job.get("type") or ""
    payload = job.get("payload") or {}
    handler = JOB_HANDLERS.get(job_type)
    if handler is None:
        fail_job(job_id, f"unknown job type: {job_type}")
        return {"job_id": job_id, "type": job_type, "status": "failed", "error": "unknown job type"}

    try:
        result = handler(db, payload)
        complete_job(job_id, result)
        return {"job_id": job_id, "type": job_type, "status": "completed", "result": result}
    except Exception as exc:
        logger.exception("Job %s (%s) failed", job_id, job_type)
        fail_job(job_id, str(exc))
        return {"job_id": job_id, "type": job_type, "status": "failed", "error": str(exc)}
