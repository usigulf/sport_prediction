"""Optional Sentry reporting for webhook and ops anomalies."""
from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger(__name__)


def report_webhook_issue(message: str, *, level: str = "warning", **context: Any) -> None:
    """Log and optionally send to Sentry when SENTRY_DSN is configured."""
    log_level = logging.ERROR if level == "error" else logging.WARNING
    logger.log(log_level, message, extra=context)
    dsn = (get_settings().sentry_dsn or "").strip()
    if not dsn:
        return
    try:
        import sentry_sdk

        sentry_sdk.capture_message(message, level=level, extras=context)
    except Exception:
        logger.exception("Sentry capture failed for webhook issue")
