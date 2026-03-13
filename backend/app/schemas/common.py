"""
Common schemas and serialization helpers
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

# Max limit for list endpoints (games, feed, prediction-history, etc.)
PAGINATION_MAX_LIMIT = 100


def datetime_to_iso(dt: Optional[datetime]) -> Optional[str]:
    """Serialize datetime to ISO 8601 string. Naive datetimes treated as UTC (append Z)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.isoformat() + "Z"
    return dt.isoformat()


class PaginationParams(BaseModel):
    """Query params for paginated lists. Enforced on all list endpoints."""
    skip: int = Field(0, ge=0, description="Number of records to skip")
    limit: int = Field(20, ge=1, le=PAGINATION_MAX_LIMIT, description=f"Page size (max {PAGINATION_MAX_LIMIT})")

    class Config:
        from_attributes = True
