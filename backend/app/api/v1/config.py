"""Public config: feature flags and experiment assignments (Imp #77, #86–87)."""
from __future__ import annotations

import hashlib

from typing import Optional

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user_optional
from app.models.user import User
from app.services.feature_flags import get_feature_flags

router = APIRouter(prefix="/config", tags=["config"])


def _experiment_variant(user_key: str, experiment: str, variants: tuple[str, ...]) -> str:
    """Deterministic bucket for A/B tests without external SDK."""
    digest = hashlib.sha256(f"{experiment}:{user_key}".encode()).hexdigest()
    idx = int(digest[:8], 16) % len(variants)
    return variants[idx]


@router.get("/feature-flags")
async def read_feature_flags(
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    flags = dict(get_feature_flags())
    user_key = str(current_user.id) if current_user else "anonymous"
    flags["experiments"] = {
        "trial_length_days": int(
            _experiment_variant(user_key, "trial_length", ("7", "14"))
        ),
        "paywall_price_tier": _experiment_variant(
            user_key, "paywall_price", ("standard", "discount")
        ),
    }
    return {"flags": flags}
