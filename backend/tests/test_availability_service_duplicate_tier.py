from types import SimpleNamespace
from unittest.mock import Mock

from app.domain.schemas import ArtistTier, CartMenu, FlatAddon, FourHandRequestInfo, ServiceOffer, TierPricing
from app.services.availability_service import AvailabilityService

# 2026-08-18 live incident: manicure's "regular" tier has TWO technicians on two separate Square
# variations (different duration, same price) — a single next(...) pick used to silently keep only
# the first and drop the second technician's entire calendar from every search, permanently, not
# just "no slot today". These fixtures reproduce that exact shape.
REGULAR_TECH_1 = TierPricing(
    tier=ArtistTier.REGULAR, variation_id="VAR_120MIN", variation_version=1,
    price=85.0, compare_at_price=99.0, duration_minutes=120, team_member_ids=["TM_120"],
)
REGULAR_TECH_2 = TierPricing(
    tier=ArtistTier.REGULAR, variation_id="VAR_150MIN", variation_version=1,
    price=85.0, compare_at_price=99.0, duration_minutes=150, team_member_ids=["TM_150"],
)
TOP_TECH = TierPricing(
    tier=ArtistTier.TOP, variation_id="VAR_TOP", variation_version=1,
    price=93.0, compare_at_price=109.0, duration_minutes=120, team_member_ids=["TM_TOP1", "TM_TOP2"],
)


def _cart_menu() -> CartMenu:
    manicure = ServiceOffer(
        slug="manicure", name="Manicure", offer_label=None, description=None, is_first_time_offer=True,
        pricing=[TOP_TECH, REGULAR_TECH_1, REGULAR_TECH_2],
    )
    pedicure = ServiceOffer(
        slug="pedicure", name="Pedicure", offer_label=None, description=None, is_first_time_offer=True,
        pricing=[TOP_TECH],
    )
    design_addon = FlatAddon(
        slug="design", name="Nail Art", description=None, price=15.0, duration_minutes=15,
        variation_id="VAR_DESIGN", variation_version=1, team_member_ids=["TM_120", "TM_150"],
        requires_slug="manicure",
    )
    four_hand = FourHandRequestInfo(slug="four-hand-request", name="4-Hand", description="")
    return CartMenu(manicure=manicure, pedicure=pedicure, design_addon=design_addon, four_hand_request=four_hand)


def _service(search_by_variation: dict[str, list]):
    catalog_service = Mock()
    catalog_service.get_cart_menu.return_value = _cart_menu()
    artist_service = Mock()
    artist_service.list_artists.return_value = []
    availability_gateway = Mock()
    availability_gateway.search.side_effect = lambda service_variation_ids, **kw: search_by_variation.get(
        service_variation_ids[0], []
    )
    return AvailabilityService(availability_gateway, catalog_service, artist_service)


def test_both_technicians_sharing_a_tier_are_searched_and_merged():
    service = _service({
        "VAR_120MIN": [SimpleNamespace(
            start_at="2026-08-20T18:00:00Z",
            appointment_segments=[SimpleNamespace(team_member_id="TM_120")],
        )],
        "VAR_150MIN": [SimpleNamespace(
            start_at="2026-08-18T23:20:00Z",  # the technician the old next()-based code never searched
            appointment_segments=[SimpleNamespace(team_member_id="TM_150")],
        )],
        "VAR_TOP": [],
    })

    response = service.get_availability(service_slugs=["manicure"], artist_selection="any", days=7)

    start_times = {s.start_at for s in response.slots}
    assert "2026-08-18T23:20:00Z" in start_times, "second regular-tier technician's slot must not be dropped"
    assert "2026-08-20T18:00:00Z" in start_times

    tm150_slot = next(s for s in response.slots if s.start_at == "2026-08-18T23:20:00Z")
    assert tm150_slot.team_member_id == "TM_150"
    assert tm150_slot.duration_minutes == 150
    assert tm150_slot.price == 85.0


def test_specific_artist_selection_still_finds_the_second_technician():
    service = _service({
        "VAR_150MIN": [SimpleNamespace(
            start_at="2026-08-18T23:20:00Z",
            appointment_segments=[SimpleNamespace(team_member_id="TM_150")],
        )],
    })

    response = service.get_availability(service_slugs=["manicure"], artist_selection="TM_150", days=7)

    assert len(response.slots) == 1
    assert response.slots[0].team_member_id == "TM_150"
