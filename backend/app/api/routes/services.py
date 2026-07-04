from fastapi import APIRouter, Depends

from app.api.deps import get_catalog_service
from app.domain.schemas import CartMenu
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=CartMenu)
def get_cart_menu(catalog_service: CatalogService = Depends(get_catalog_service)) -> CartMenu:
    """The primary service, combinable add-ons, and the 4-hand request info
    that power the "Customize your visit" step.
    """
    return catalog_service.get_cart_menu()
