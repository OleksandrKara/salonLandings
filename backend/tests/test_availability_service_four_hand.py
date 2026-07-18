from types import SimpleNamespace
from unittest.mock import Mock

from app.services.availability_service import AvailabilityService


def _service(availabilities):
    catalog_service = Mock()
    catalog_service.get_four_hand_catalog_item.return_value = {
        "variation_id": "V1",
        "variation_version": 3,
        "team_member_id": "TM1",
        "duration_minutes": 150,
    }
    availability_gateway = Mock()
    availability_gateway.search.return_value = availabilities
    return AvailabilityService(availability_gateway, catalog_service, Mock())


def test_four_hand_availability_builds_flat_zero_price_slots():
    service = _service([SimpleNamespace(start_at="2026-08-01T18:00:00Z")])

    response = service.get_availability(service_slugs=["four-hand-request"], artist_selection="any", days=32)

    assert response.services == ["four-hand-request"]
    assert len(response.slots) == 1
    slot = response.slots[0]
    assert slot.start_at == "2026-08-01T18:00:00Z"
    assert slot.duration_minutes == 150
    assert slot.team_member_id == "TM1"
    assert slot.price == 0.0
    assert slot.is_best_price is True
    assert len(slot.segments) == 1
    assert slot.segments[0].variation_id == "V1"
    assert slot.segments[0].service_slug == "four-hand-request"


def test_four_hand_availability_no_open_slots_returns_empty_list():
    service = _service([])

    response = service.get_availability(service_slugs=["four-hand-request"], artist_selection="any", days=32)

    assert response.slots == []
