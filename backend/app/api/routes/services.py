from fastapi import APIRouter, Depends, Response

from app.api.deps import get_catalog_service
from app.domain.schemas import CartMenu
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/api/services", tags=["services"])

# Pricing/offer copy (the "15% OFF" hero badge, etc.) changes rarely — cache in the browser so a
# repeat page load renders it instantly instead of visibly popping in after a fetch. 1h fresh,
# then up to a day of serving stale-while-revalidating in the background if the tab stays open
# longer than that; either way a real edit in Square shows up within, worst case, a day.
CART_MENU_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400"


@router.get("", response_model=CartMenu)
def get_cart_menu(response: Response, catalog_service: CatalogService = Depends(get_catalog_service)) -> CartMenu:
    """The primary service, combinable add-ons, and the 4-hand request info
    that power the "Customize your visit" step.
    """
    response.headers["Cache-Control"] = CART_MENU_CACHE_CONTROL
    return catalog_service.get_cart_menu()
