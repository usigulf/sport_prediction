"""Redis-backed job queue for long-running internal tasks (Weakness #42 / Imp #52)."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from app.services.cache_service import CacheService

logger = logging.getLogger(__name__)

QUEUE_KEY = "jobs:pending"
JOB_PREFIX = "jobs:item:"


def enqueue_job(job_type: str, payload: dict[str, Any] | None = None) -> str:
    """Enqueue a job; returns job id. Falls back to in-memory list when Redis disabled."""
    job_id = str(uuid.uuid4())
    body = {
        "id": job_id,
        "type": job_type,
        "payload": payload or {},
        "enqueued_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
    }
    cache = CacheService()
    if cache.redis_client:
        cache.redis_client.lpush(QUEUE_KEY, job_id)
        cache.redis_client.setex(f"{JOB_PREFIX}{job_id}", 86400, json.dumps(body))
    else:
        cache.set(f"{JOB_PREFIX}{job_id}", body, ttl=86400)
        pending = cache.get(QUEUE_KEY) or []
        pending.insert(0, job_id)
        cache.set(QUEUE_KEY, pending, ttl=86400)
    return job_id


def dequeue_job() -> dict[str, Any] | None:
    """Pop next pending job (internal worker/cron)."""
    cache = CacheService()
    job_id = None
    if cache.redis_client:
        job_id = cache.redis_client.rpop(QUEUE_KEY)
    else:
        pending = cache.get(QUEUE_KEY) or []
        if pending:
            job_id = pending.pop()
            cache.set(QUEUE_KEY, pending, ttl=86400)
    if not job_id:
        return None
    key = f"{JOB_PREFIX}{job_id}"
    if cache.redis_client:
        raw = cache.redis_client.get(key)
        if not raw:
            return None
        data = json.loads(raw)
    else:
        data = cache.get(key)
    if data:
        data["status"] = "processing"
        if cache.redis_client:
            cache.redis_client.setex(key, 86400, json.dumps(data))
        else:
            cache.set(key, data, ttl=86400)
    return data


def get_job(job_id: str) -> dict[str, Any] | None:
    cache = CacheService()
    key = f"{JOB_PREFIX}{job_id}"
    if cache.redis_client:
        raw = cache.redis_client.get(key)
        if not raw:
            return None
        return json.loads(raw)
    return cache.get(key)
