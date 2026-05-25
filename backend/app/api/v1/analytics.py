"""
Client analytics ingestion (ad session metrics, optional).
"""
from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.deps import get_current_user_optional, rate_limit_predictions
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


class AdSessionPayload(BaseModel):
    sessionId: Optional[str] = None
    ad_impression_count: int = Field(default=0, ge=0)
    ad_clicks: int = Field(default=0, ge=0)
    rewarded_ads_watched: int = Field(default=0, ge=0)
    revenue_per_session_micros: int = Field(default=0, ge=0)
    sessionDurationMs: Optional[int] = Field(default=None, ge=0)
    screen_where_ad_shown: dict[str, int] = Field(default_factory=dict)


@router.post("/ad-events", status_code=204)
async def ingest_ad_events(
    payload: AdSessionPayload,
    _: None = Depends(rate_limit_predictions),
    current_user: Optional[User] = Depends(get_current_user_optional),
) -> None:
    """Accept batched ad session metrics from the mobile app (logged server-side)."""
    user_label = str(current_user.id) if current_user else "anonymous"
    logger.info(
        "ad_session user=%s session=%s impressions=%s clicks=%s rewarded=%s duration_ms=%s",
        user_label,
        payload.sessionId,
        payload.ad_impression_count,
        payload.ad_clicks,
        payload.rewarded_ads_watched,
        payload.sessionDurationMs,
    )
