import logging

from app.domain.schemas import ArtistTier, CartMenu, FlatAddon, FourHandRequestInfo, ServiceOffer, TierPricing
from app.domain.service_catalog import (
    FLAT_ADDON_DEFINITIONS,
    FOUR_HAND_REQUEST,
    SERVICE_OFFER_DEFINITIONS,
    FlatAddonDefinition,
    ServiceOfferDefinition,
    is_top_tier_variation_name,
)
from app.integrations.square.catalog import SquareCatalogRepository

logger = logging.getLogger(__name__)


class ServiceNotFoundError(Exception):
    pass


class CatalogService:
    """Builds landing-page cart items by combining our slug mapping with live
    pricing/duration/team-member data from Square.
    """

    def __init__(self, catalog_repo: SquareCatalogRepository):
        self._catalog_repo = catalog_repo

    def get_cart_menu(self) -> CartMenu:
        manicure = self.get_service_offer("manicure")
        pedicure = self.get_service_offer("pedicure")
        design = self.get_flat_addon("design")
        return CartMenu(
            manicure=manicure,
            pedicure=pedicure,
            design_addon=design,
            four_hand_request=FourHandRequestInfo(
                slug=FOUR_HAND_REQUEST.slug,
                name=FOUR_HAND_REQUEST.name,
                description=FOUR_HAND_REQUEST.description,
                price_description=self._four_hand_price_description(),
                price=FOUR_HAND_REQUEST.display_price,
                compare_at_price=FOUR_HAND_REQUEST.display_compare_at_price,
            ),
        )

    def list_service_offers(self) -> list[ServiceOffer]:
        return [self._build_offer(definition) for definition in SERVICE_OFFER_DEFINITIONS]

    def get_service_offer(self, slug: str) -> ServiceOffer:
        definition = next((d for d in SERVICE_OFFER_DEFINITIONS if d.slug == slug), None)
        if definition is None:
            raise ServiceNotFoundError(f"Unknown service '{slug}'")
        return self._build_offer(definition)

    def get_flat_addon(self, slug: str) -> FlatAddon:
        definition = next((d for d in FLAT_ADDON_DEFINITIONS if d.slug == slug), None)
        if definition is None:
            raise ServiceNotFoundError(f"Unknown add-on '{slug}'")
        return self._build_flat_addon(definition)

    def get_four_hand_catalog_item(self) -> dict:
        item = self._catalog_repo.get_item(FOUR_HAND_REQUEST.item_id)
        variation = next(
            (v for v in item.item_data.variations or [] if v.id == FOUR_HAND_REQUEST.variation_id), None
        )
        if variation is None:
            raise ServiceNotFoundError(f"Variation '{FOUR_HAND_REQUEST.variation_id}' not found")
        vd = variation.item_variation_data
        team_member_ids = vd.team_member_ids or []
        if not team_member_ids:
            raise ServiceNotFoundError("4-hand request variation has no assigned team member")

        return {
            "variation_id": variation.id,
            "variation_version": variation.version,
            "team_member_id": team_member_ids[0],
            "duration_minutes": (vd.service_duration or 0) // 60_000,
        }

    def _four_hand_price_description(self) -> str | None:
        item = self._catalog_repo.get_item(FOUR_HAND_REQUEST.item_id)
        for variation in item.item_data.variations or []:
            if variation.id == FOUR_HAND_REQUEST.variation_id:
                return variation.item_variation_data.price_description or None
        return None

    def _build_offer(self, definition: ServiceOfferDefinition) -> ServiceOffer:
        first_time_item = self._catalog_repo.get_item(definition.first_time_item_id)
        regular_item = (
            self._catalog_repo.get_item(definition.regular_price_item_id)
            if definition.regular_price_item_id
            else None
        )

        regular_prices_by_tier = self._prices_by_tier(regular_item) if regular_item else {}

        pricing: list[TierPricing] = []
        for variation in first_time_item.item_data.variations or []:
            vd = variation.item_variation_data
            tier = ArtistTier.TOP if is_top_tier_variation_name(vd.name or "") else ArtistTier.REGULAR
            price_amount = vd.price_money.amount if vd.price_money else None
            if price_amount is None:
                logger.warning("Variation %s on item %s has no fixed price; skipping", variation.id, first_time_item.id)
                continue

            pricing.append(
                TierPricing(
                    tier=tier,
                    variation_id=variation.id,
                    variation_version=variation.version,
                    price=price_amount / 100,
                    compare_at_price=regular_prices_by_tier.get(tier),
                    duration_minutes=(vd.service_duration or 0) // 60_000,
                    team_member_ids=vd.team_member_ids or [],
                )
            )

        return ServiceOffer(
            slug=definition.slug,
            name=definition.name,
            offer_label=definition.offer_label,
            description=definition.description,
            is_first_time_offer=definition.is_first_time_offer,
            pricing=pricing,
        )

    def _build_flat_addon(self, definition: FlatAddonDefinition) -> FlatAddon:
        item = self._catalog_repo.get_item(definition.item_id)
        variations = item.item_data.variations or []
        if not variations:
            raise ServiceNotFoundError(f"Add-on item '{definition.item_id}' has no variations")

        variation = variations[0]
        vd = variation.item_variation_data
        price_amount = vd.price_money.amount if vd.price_money else 0

        return FlatAddon(
            slug=definition.slug,
            name=definition.name,
            description=definition.description,
            price=price_amount / 100,
            duration_minutes=(vd.service_duration or 0) // 60_000,
            variation_id=variation.id,
            variation_version=variation.version,
            team_member_ids=vd.team_member_ids or [],
            requires_slug=definition.requires_slug,
        )

    @staticmethod
    def _prices_by_tier(item) -> dict[ArtistTier, float]:
        prices: dict[ArtistTier, float] = {}
        for variation in item.item_data.variations or []:
            vd = variation.item_variation_data
            if not vd.price_money:
                continue
            tier = ArtistTier.TOP if is_top_tier_variation_name(vd.name or "") else ArtistTier.REGULAR
            prices[tier] = vd.price_money.amount / 100
        return prices
