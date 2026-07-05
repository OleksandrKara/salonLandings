import json
import logging

from app.integrations.marketing_db.repository import MarketingRepository

logger = logging.getLogger(__name__)


class ExperimentService:
    """Resolves which variant(s) of a landing page a visitor should see.

    Eligibility is decided entirely server-side: the caller always gets back a list of
    variants and does a weighted random pick over it — a single-item list (the fallback
    case, when no experiment is running, or a forced campaign link) needs no
    special-casing on the client.
    """

    def __init__(self, repository: MarketingRepository):
        self._repository = repository

    async def resolve_variants(self, slug: str, variant_key: str | None = None) -> dict:
        page = await self._repository.get_landing_page_by_slug(slug)
        if page is None:
            return {"landing_page_id": None, "experiment_status": "none", "variants": []}

        if variant_key:
            forced = await self._repository.get_variant_by_key(page["id"], variant_key)
            if forced is not None:
                return {
                    "landing_page_id": str(page["id"]),
                    "experiment_status": "forced",
                    "variants": [self._serialize(forced)],
                }
            # Unknown/typo'd/deactivated key — fall through to the normal experiment/fallback
            # logic below rather than erroring, same "never break page load" guarantee as
            # the rest of this service.

        experiment = await self._repository.get_active_experiment(page["id"])
        if experiment is not None:
            active_variants = await self._repository.list_active_variants(page["id"])
            if active_variants:
                return {
                    "landing_page_id": str(page["id"]),
                    "experiment_status": "active",
                    "variants": [self._serialize(v) for v in active_variants],
                }

        fallback = await self._repository.get_fallback_variant(page["id"])
        return {
            "landing_page_id": str(page["id"]),
            "experiment_status": experiment["status"] if experiment is not None else "none",
            "variants": [self._serialize(fallback)] if fallback is not None else [],
        }

    @staticmethod
    def _serialize(variant) -> dict:
        content = variant["content"]
        return {
            "id": str(variant["id"]),
            "name": variant["name"],
            "weight": variant["weight"],
            "content": json.loads(content) if isinstance(content, str) else content,
        }
