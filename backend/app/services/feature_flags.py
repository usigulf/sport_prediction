"""Server-side feature flags (env-driven; Imp #77)."""
from __future__ import annotations

import os
from functools import lru_cache


def _truthy(val: str | None) -> bool:
    return (val or "").strip().lower() in ("1", "true", "yes", "on")


@lru_cache
def get_feature_flags() -> dict[str, bool]:
    return {
        "odds_display": _truthy(os.getenv("FEATURE_ODDS_DISPLAY", "true")),
        "player_props": _truthy(os.getenv("FEATURE_PLAYER_PROPS", "false")),
        "referral_program": _truthy(os.getenv("FEATURE_REFERRAL_PROGRAM", "true")),
        "email_digest": _truthy(os.getenv("FEATURE_EMAIL_DIGEST", "false")),
        "parlay_correlation_warnings": _truthy(
            os.getenv("FEATURE_PARLAY_WARNINGS", "true")
        ),
    }


def is_enabled(flag: str) -> bool:
    return get_feature_flags().get(flag, False)
