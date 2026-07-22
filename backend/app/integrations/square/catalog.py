import logging

from square import Square
from square.types.catalog_object import CatalogObject

from app.core.cache import TTLCache
from app.integrations.square.errors import SQUARE_CALL_ERRORS, square_error_detail
from app.integrations.square.exceptions import SquareIntegrationError

logger = logging.getLogger(__name__)


class SquareCatalogRepository:
    """Read access to Square's catalog, cached to avoid a full list call per request."""

    def __init__(self, client: Square, cache_ttl_seconds: float):
        self._client = client
        self._cache: TTLCache[dict[str, CatalogObject]] = TTLCache(cache_ttl_seconds)

    def _fetch_items(self) -> dict[str, CatalogObject]:
        logger.info("Fetching Square catalog items")
        try:
            pager = self._client.catalog.list(types="ITEM")
            return {obj.id: obj for obj in pager}
        except SQUARE_CALL_ERRORS as exc:
            detail = square_error_detail(exc)
            logger.error("Square catalog list failed: %s", detail if detail is not None else exc)
            raise SquareIntegrationError("Unable to load service catalog from Square", detail=detail) from exc

    def get_item(self, item_id: str) -> CatalogObject:
        items = self._cache.get_or_fetch(self._fetch_items)
        item = items.get(item_id)
        if item is None:
            raise SquareIntegrationError(
                f"Square catalog item '{item_id}' was not found. It may have been deleted or archived.",
                status_code=502,
            )
        return item
