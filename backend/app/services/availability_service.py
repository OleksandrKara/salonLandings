import datetime as dt
import logging
from dataclasses import dataclass

from app.domain.schemas import ArtistTier, AvailabilityResponse, CartMenu, SegmentOption, SlotOption
from app.domain.service_catalog import FOUR_HAND_REQUEST
from app.integrations.square.availability import SquareAvailabilityGateway
from app.services.artist_service import ArtistService
from app.services.catalog_service import CatalogService, ServiceNotFoundError

logger = logging.getLogger(__name__)

ANY_ARTIST = "any"
FOUR_HAND_SLUG = FOUR_HAND_REQUEST.slug


class InvalidCartError(Exception):
    pass


class NoEligibleArtistError(Exception):
    pass


@dataclass
class _SegmentSpec:
    service_slug: str
    name: str
    variation_id: str
    variation_version: int
    price: float
    compare_at_price: float | None
    duration_minutes: int
    team_member_ids: set[str]


@dataclass
class _ComboOption:
    tier: ArtistTier
    segments: list[_SegmentSpec]
    eligible_team_member_ids: set[str]

    @property
    def total_price(self) -> float:
        return sum(s.price for s in self.segments)

    @property
    def total_compare_at_price(self) -> float:
        return sum(s.compare_at_price if s.compare_at_price is not None else s.price for s in self.segments)

    @property
    def total_duration_minutes(self) -> int:
        return sum(s.duration_minutes for s in self.segments)


class AvailabilityService:
    """Implements the "always give the customer the lowest eligible price" rule
    for a cart that may combine several services in one appointment
    (e.g. manicure + pedicure, or manicure + nail-art design):

    for each artist tier able to perform every selected service, we search
    Square for openings and, for each point in time, surface whichever tier is
    available at the lower total price. Add-ons like nail-art design are
    restricted to whichever artists Square lists on that variation, which can
    exclude the cheaper tier entirely — the intersection logic below is what
    naturally enforces that from live catalog data instead of hardcoding it.
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

    def get_availability(self, *, service_slugs: list[str], artist_selection: str, days: int) -> AvailabilityResponse:
        if service_slugs == [FOUR_HAND_SLUG]:
            return self._get_four_hand_availability(days)

        cart_menu = self._catalog_service.get_cart_menu()
        combo_options = self._build_combo_options(cart_menu, service_slugs)
        if not combo_options:
            raise NoEligibleArtistError("No artist can perform every selected service together.")

        artist_names = {a.id: a.display_name for a in self._artist_service.list_artists([cart_menu.manicure, cart_menu.pedicure])}
        advertised_price = self._advertised_price(combo_options)
        start_at, end_at = self._search_window(days)

        all_slots: list[SlotOption] = []
        for combo in combo_options:
            team_member_ids = list(combo.eligible_team_member_ids)
            if artist_selection != ANY_ARTIST:
                if artist_selection not in combo.eligible_team_member_ids:
                    continue
                team_member_ids = [artist_selection]

            raw_availabilities = self._availability_gateway.search(
                service_variation_ids=[s.variation_id for s in combo.segments],
                start_at=start_at,
                end_at=end_at,
                team_member_ids=team_member_ids,
            )
            for availability in raw_availabilities:
                team_member_id = availability.appointment_segments[0].team_member_id
                all_slots.append(self._build_slot(combo, availability.start_at, team_member_id, advertised_price, artist_names))

        # Same start time may be open on more than one tier — keep only the cheapest.
        best_by_start: dict[str, SlotOption] = {}
        for slot in all_slots:
            current_best = best_by_start.get(slot.start_at)
            if current_best is None or slot.price < current_best.price:
                best_by_start[slot.start_at] = slot

        slots = list(best_by_start.values())
        self._flag_best_price(slots)
        slots.sort(key=lambda s: s.start_at)
        return AvailabilityResponse(services=service_slugs, artist_selection=artist_selection, slots=slots)

    def _get_four_hand_availability(self, days: int) -> AvailabilityResponse:
        """The 4-hand path books Square's own $0 placeholder item (see catalog_service.
        get_four_hand_catalog_item) — no artist tiers, no SmartMatch pricing, just "is this real
        time slot open on the one team member Square has assigned to it." Kept as its own method
        rather than squeezed into _build_combo_options, since none of that method's tier/price
        comparison machinery applies to a flat $0 lead-capture item.
        """
        item = self._catalog_service.get_four_hand_catalog_item()
        start_at, end_at = self._search_window(days)
        availabilities = self._availability_gateway.search(
            service_variation_ids=[item["variation_id"]],
            start_at=start_at,
            end_at=end_at,
            team_member_ids=[item["team_member_id"]],
        )
        slots = [self._build_four_hand_slot(item, a.start_at) for a in availabilities]
        slots.sort(key=lambda s: s.start_at)
        return AvailabilityResponse(services=[FOUR_HAND_SLUG], artist_selection=ANY_ARTIST, slots=slots)

    @staticmethod
    def _build_four_hand_slot(item: dict, start_at: str) -> SlotOption:
        start = dt.datetime.fromisoformat(start_at.replace("Z", "+00:00"))
        end = start + dt.timedelta(minutes=item["duration_minutes"])
        return SlotOption(
            start_at=start_at,
            end_at=end.isoformat().replace("+00:00", "Z"),
            duration_minutes=item["duration_minutes"],
            team_member_id=item["team_member_id"],
            artist_name=None,
            tier=ArtistTier.REGULAR,  # unused for this path; required by the schema
            price=0.0,
            compare_at_price=None,
            advertised_price=0.0,
            savings=0.0,
            is_best_price=True,
            segments=[
                SegmentOption(
                    service_slug=FOUR_HAND_SLUG,
                    name=FOUR_HAND_REQUEST.name,
                    variation_id=item["variation_id"],
                    variation_version=item["variation_version"],
                    price=0.0,
                    compare_at_price=None,
                    duration_minutes=item["duration_minutes"],
                )
            ],
        )

    def _build_combo_options(self, cart_menu: CartMenu, service_slugs: list[str]) -> list[_ComboOption]:
        tiered_offers = {cart_menu.manicure.slug: cart_menu.manicure, cart_menu.pedicure.slug: cart_menu.pedicure}
        design = cart_menu.design_addon

        tiered_slugs = [s for s in service_slugs if s in tiered_offers]
        flat_slugs = [s for s in service_slugs if s == design.slug]
        unknown_slugs = [s for s in service_slugs if s not in tiered_offers and s != design.slug]
        if unknown_slugs:
            raise ServiceNotFoundError(f"Unknown service(s): {', '.join(unknown_slugs)}")
        if not tiered_slugs and not flat_slugs:
            raise InvalidCartError("Select at least one service.")
        for slug in flat_slugs:
            if design.requires_slug not in tiered_slugs:
                raise InvalidCartError(f"'{design.name}' requires '{design.requires_slug}' to also be selected.")

        combos: list[_ComboOption] = []
        for tier in (ArtistTier.TOP, ArtistTier.REGULAR):
            segments: list[_SegmentSpec] = []
            eligible: set[str] | None = None
            feasible = True

            for slug in tiered_slugs:
                offer = tiered_offers[slug]
                tier_pricing = next((p for p in offer.pricing if p.tier == tier), None)
                if tier_pricing is None:
                    feasible = False
                    break
                team_ids = set(tier_pricing.team_member_ids)
                eligible = team_ids if eligible is None else eligible & team_ids
                segments.append(
                    _SegmentSpec(
                        service_slug=offer.slug,
                        name=offer.name,
                        variation_id=tier_pricing.variation_id,
                        variation_version=tier_pricing.variation_version,
                        price=tier_pricing.price,
                        compare_at_price=tier_pricing.compare_at_price,
                        duration_minutes=tier_pricing.duration_minutes,
                        team_member_ids=team_ids,
                    )
                )

            if feasible:
                for slug in flat_slugs:
                    team_ids = set(design.team_member_ids)
                    eligible = team_ids if eligible is None else eligible & team_ids
                    segments.append(
                        _SegmentSpec(
                            service_slug=design.slug,
                            name=design.name,
                            variation_id=design.variation_id,
                            variation_version=design.variation_version,
                            price=design.price,
                            compare_at_price=None,
                            duration_minutes=design.duration_minutes,
                            team_member_ids=team_ids,
                        )
                    )

            if feasible and eligible:
                combos.append(_ComboOption(tier=tier, segments=segments, eligible_team_member_ids=eligible))

        return combos

    @staticmethod
    def _advertised_price(combo_options: list[_ComboOption]) -> float:
        top_combo = next((c for c in combo_options if c.tier == ArtistTier.TOP), None)
        if top_combo is not None:
            return top_combo.total_price
        return min(c.total_price for c in combo_options)

    @staticmethod
    def _build_slot(
        combo: _ComboOption,
        start_at: str,
        team_member_id: str,
        advertised_price: float,
        artist_names: dict[str, str],
    ) -> SlotOption:
        start = dt.datetime.fromisoformat(start_at.replace("Z", "+00:00"))
        total_duration = combo.total_duration_minutes
        end = start + dt.timedelta(minutes=total_duration)
        price = combo.total_price
        savings = round(max(advertised_price - price, 0), 2)

        return SlotOption(
            start_at=start_at,
            end_at=end.isoformat().replace("+00:00", "Z"),
            duration_minutes=total_duration,
            team_member_id=team_member_id,
            artist_name=artist_names.get(team_member_id),
            tier=combo.tier,
            price=price,
            compare_at_price=combo.total_compare_at_price,
            advertised_price=advertised_price,
            savings=savings,
            segments=[
                SegmentOption(
                    service_slug=s.service_slug,
                    name=s.name,
                    variation_id=s.variation_id,
                    variation_version=s.variation_version,
                    price=s.price,
                    compare_at_price=s.compare_at_price,
                    duration_minutes=s.duration_minutes,
                )
                for s in combo.segments
            ],
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
