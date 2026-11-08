import datetime as dt
from zoneinfo import ZoneInfo

from app.services.availability_service import earliest_bookable_start

LA = ZoneInfo("America/Los_Angeles")


def _earliest(y, m, d, h, mi=0):
    now = dt.datetime(y, m, d, h, mi, tzinfo=LA)
    return earliest_bookable_start(now.astimezone(dt.timezone.utc)).astimezone(LA)


def test_during_manager_shift_nothing_is_added():
    now = dt.datetime(2026, 11, 9, 14, 30, tzinfo=LA)
    assert earliest_bookable_start(now) == now


def test_evening_booking_cannot_start_before_ten_next_morning():
    assert _earliest(2026, 11, 8, 23, 30) == dt.datetime(2026, 11, 9, 10, 0, tzinfo=LA)


def test_after_eight_pm_sharp_is_off_shift():
    assert _earliest(2026, 11, 8, 20, 0) == dt.datetime(2026, 11, 9, 10, 0, tzinfo=LA)


def test_small_hours_wait_for_ten_the_same_day():
    assert _earliest(2026, 11, 9, 2, 15) == dt.datetime(2026, 11, 9, 10, 0, tzinfo=LA)


def test_dst_change_night_still_lands_on_ten_local():
    assert _earliest(2026, 11, 1, 23, 0) == dt.datetime(2026, 11, 2, 10, 0, tzinfo=LA)
