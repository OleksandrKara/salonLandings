import datetime as dt
import logging

from app.domain.schemas import AvailabilityResponse, ServiceOffer, SlotOption, TierPricing
from app.integrations.square.availability import SquareAvailabilityGateway
from app.services.artist_service import ArtistNotFoundError, ArtistService
from app.services.catalog_service import CatalogService

logger = logging.getLogger(__name__)

ANY_ARTIST = "any"


class AvailabilityService:
    """Implements the "always give the customer the lowest eligible price" rule:

    when the customer selects "Any Artist", we query Square for openings on
    every artist tier for the chosen service and, for each point in time,
    surface whichever tier is available at the lower price. When the customer
    picks a specific artist, we query only that artist's tier.
    """

    def __init__(
        self,
        availability_gateway: SquareAvailabilityGateway,
        catalog_service: CatalogService,
        artist_service: ArtistService,
    ):
        self._availability_gateway = availability_gateway
        self._catalog_service = catalog_service
        self._artist_service = artist_service

    def get_availability(self, *, service_slug: str, artist_selection: str, days: int) -> AvailabilityResponse:
        offer = self._catalog_service.get_service_offer(service_slug)
        start_at, end_at = self._search_window(days)
        artist_names = {a.id: a.display_name for a in self._artist_service.list_artists([offer])}

        if artist_selection == ANY_ARTIST:
            slots = self._search_any_artist(offer, start_at, end_at, artist_names)
        else:
            slots = self._search_specific_artist(offer, artist_selection, start_at, end_at, artist_names)

        self._flag_best_price(slots)
        slots.sort(key=lambda s: s.start_at)
        return AvailabilityResponse(service_slug=service_slug, artist_selection=artist_selection, slots=slots)

    def _search_any_artist(
        self, offer: ServiceOffer, start_at: str, end_at: str, artist_names: dict[str, str]
    ) -> list[SlotOption]:
        all_slots: list[SlotOption] = []
        for tier_pricing in offer.pricing:
            raw_availabilities = self._availability_gateway.search(
                service_variation_id=tier_pricing.variation_id, start_at=start_at, end_at=end_at
            )
            for availability in raw_availabilities:
                segment = availability.appointment_segments[0]
                all_slots.append(
                    self._build_slot(offer, tier_pricing, availability.start_at, segment.team_member_id, artist_names)
                )

        # Same start time may be open on more than one tier — keep only the cheapest.
        best_by_start: dict[str, SlotOption] = {}
        for slot in all_slots:
            current_best = best_by_start.get(slot.start_at)
            if current_best is None or slot.price < current_best.price:
                best_by_start[slot.start_at] = slot
        return list(best_by_start.values())

    def _search_specific_artist(
        self,
        offer: ServiceOffer,
        team_member_id: str,
        start_at: str,
        end_at: str,
        artist_names: dict[str, str],
    ) -> list[SlotOption]:
        tier_pricing = next((tp for tp in offer.pricing if team_member_id in tp.team_member_ids), None)
        if tier_pricing is None:
            raise ArtistNotFoundError(f"Selected artist does not offer '{offer.name}'")

        raw_availabilities = self._availability_gateway.search(
            service_variation_id=tier_pricing.variation_id,
            start_at=start_at,
            end_at=end_at,
            team_member_id=team_member_id,
        )
        return [
            self._build_slot(offer, tier_pricing, availability.start_at, team_member_id, artist_names)
            for availability in raw_availabilities
        ]

    @staticmethod
    def _build_slot(
        offer: ServiceOffer,
        tier_pricing: TierPricing,
        start_at: str,
        team_member_id: str,
        artist_names: dict[str, str],
    ) -> SlotOption:
        start = dt.datetime.fromisoformat(start_at.replace("Z", "+00:00"))
        end = start + dt.timedelta(minutes=tier_pricing.duration_minutes)
        advertised_price = offer.advertised_price
        savings = round(max(advertised_price - tier_pricing.price, 0), 2)

        return SlotOption(
            start_at=start_at,
            end_at=end.isoformat().replace("+00:00", "Z"),
            duration_minutes=tier_pricing.duration_minutes,
            service_variation_id=tier_pricing.variation_id,
            service_variation_version=tier_pricing.variation_version,
            team_member_id=team_member_id,
            artist_name=artist_names.get(team_member_id),
            tier=tier_pricing.tier,
            price=tier_pricing.price,
            compare_at_price=tier_pricing.compare_at_price,
            advertised_price=advertised_price,
            savings=savings,
        )

    @staticmethod
    def _flag_best_price(slots: list[SlotOption]) -> None:
        if not slots:
            return
        min_price = min(s.price for s in slots)
        for slot in slots:
            slot.is_best_price = slot.price == min_price

    @staticmethod
    def _search_window(days: int) -> tuple[str, str]:
        now = dt.datetime.now(dt.timezone.utc)
        start_at = now.isoformat().replace("+00:00", "Z")
        end_at = (now + dt.timedelta(days=days)).isoformat().replace("+00:00", "Z")
        return start_at, end_at
