"""Shared UTC bounds for a user calendar day (matches /games/upcoming date + time_zone)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo


def utc_bounds_for_calendar_day(date_str: str, time_zone: str | None) -> tuple[datetime, datetime]:
    """
    Parse YYYY-MM-DD and optional IANA time_zone.
    Returns [start_utc, end_utc) for that local calendar day.
    Raises ValueError with a short message if date or zone is invalid.
    """
    try:
        date_obj = datetime.strptime(date_str.strip(), "%Y-%m-%d").date()
    except ValueError as e:
        raise ValueError("Invalid date format. Use YYYY-MM-DD") from e
    tz_name = (time_zone or "").strip()
    if tz_name:
        try:
            tz = ZoneInfo(tz_name)
        except Exception as e:
            raise ValueError(
                "Invalid time_zone; use an IANA name (e.g. America/New_York, Europe/London)"
            ) from e
        start_local = datetime.combine(date_obj, datetime.min.time(), tzinfo=tz)
        end_local = start_local + timedelta(days=1)
        return start_local.astimezone(timezone.utc), end_local.astimezone(timezone.utc)
    start_utc = datetime.combine(date_obj, datetime.min.time(), tzinfo=timezone.utc)
    end_utc = start_utc + timedelta(days=1)
    return start_utc, end_utc
