"""
Guest (unauthenticated) browse limits: teaser picks on feed, no predictions on game lists/detail.
"""
from __future__ import annotations

from typing import Any


def cap_guest_teaser_picks(picks: list[dict[str, Any]], *, limit: int) -> list[dict[str, Any]]:
    """
    Keep schedules visible but only expose `limit` picks with prediction payloads.
    Additional picks are returned with guest_locked=True for client signup prompts.
    """
    if limit <= 0:
        return [
            {**p, "prediction": None, "guest_locked": bool(p.get("prediction"))}
            for p in picks
        ]

    out: list[dict[str, Any]] = []
    pred_shown = 0
    for pick in picks:
        row = dict(pick)
        if row.get("prediction") is not None:
            if pred_shown >= limit:
                row["prediction"] = None
                row["guest_locked"] = True
            else:
                pred_shown += 1
                row["guest_locked"] = False
        else:
            row["guest_locked"] = False
        out.append(row)
    return out
