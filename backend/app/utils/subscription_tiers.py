"""
Central subscription tier normalization and access checks.

Keep in sync with mobile `src/utils/subscription.ts`.
Raw DB values may include legacy `pro` (→ premium_plus) and Stripe `trialing` (→ premium).
"""
from __future__ import annotations

from typing import Optional

from app.models.user import User

# Tiers that grant paid app access (predictions, challenges, live updates, etc.).
PAID_ACCESS_TIERS = frozenset({"premium", "premium_plus", "pro", "trialing"})

NormalizedTier = str  # "free" | "premium" | "premium_plus"


def normalize_subscription_tier(raw: Optional[str]) -> NormalizedTier:
    """Map stored tier to canonical free | premium | premium_plus."""
    if not raw:
        return "free"
    t = str(raw).strip().lower()
    if t == "pro":
        return "premium_plus"
    if t == "trialing":
        return "premium"
    if t in ("premium", "premium_plus"):
        return t
    return "free"


def has_paid_access(raw: Optional[str]) -> bool:
    """True when user should receive Premium capabilities (any paid/legacy tier)."""
    t = (raw or "free").strip().lower()
    return t in PAID_ACCESS_TIERS


def is_free_tier(raw: Optional[str]) -> bool:
    return not has_paid_access(raw)


def is_free_tier_user(user: Optional[User]) -> bool:
    if user is None:
        return False
    return is_free_tier(user.subscription_tier)


def user_has_premium_access(user: Optional[User]) -> bool:
    if user is None:
        return False
    return has_paid_access(user.subscription_tier)
