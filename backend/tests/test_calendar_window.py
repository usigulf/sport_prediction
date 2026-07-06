"""UTC bounds for calendar-day filtering (games feed)."""
from datetime import timedelta, timezone

import pytest

from app.utils.calendar_window import utc_bounds_for_calendar_day


def test_utc_bounds_default_zone_is_utc():
    start, end = utc_bounds_for_calendar_day("2026-04-27", None)
    assert start.tzinfo == timezone.utc
    assert end - start == timedelta(days=1)


def test_utc_bounds_with_iana_zone():
    start, end = utc_bounds_for_calendar_day(" 2026-04-27 ", "America/New_York")
    assert start < end
    assert (end - start).total_seconds() == 86400


def test_invalid_date_raises():
    with pytest.raises(ValueError, match="YYYY-MM-DD"):
        utc_bounds_for_calendar_day("04-27-2026", None)


def test_invalid_timezone_raises():
    with pytest.raises(ValueError, match="IANA"):
        utc_bounds_for_calendar_day("2026-04-27", "Not/A_Zone")
