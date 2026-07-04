import logging

from app.domain.schemas import ArtistTier, ServiceOffer, TierPricing
from app.domain.service_catalog import SERVICE_OFFER_DEFINITIONS, ServiceOfferDefinition, is_top_tier_variation_name
from app.integrations.square.catalog import SquareCatalogRepository

logger = logging.getLogger(__name__)


class ServiceNotFoundError(Exception):
    pass


class CatalogService:
    """Builds landing-page ServiceOffer objects by combining our slug mapping
    with live pricing/duration/team-member data from Square.
    """

    def __init__(self, catalog_repo: SquareCatalogRepository):
        self._catalog_repo = catalog_repo

    def list_service_offers(self) -> list[ServiceOffer]:
        return [self._build_offer(definition) for definition in SERVICE_OFFER_DEFINITIONS]

    def get_service_offer(self, slug: str) -> ServiceOffer:
        definition = next((d for d in SERVICE_OFFER_DEFINITIONS if d.slug == slug), None)
        if definition is None:
            raise ServiceNotFoundError(f"Unknown service '{slug}'")
        return self._build_offer(definition)

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
