import logging

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import get_catalog_service
from app.domain.schemas import ServiceOffer
from app.services.catalog_service import CatalogService, ServiceNotFoundError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("", response_model=list[ServiceOffer])
def list_services(catalog_service: CatalogService = Depends(get_catalog_service)) -> list[ServiceOffer]:
    return catalog_service.list_service_offers()


@router.get("/{slug}", response_model=ServiceOffer)
def get_service(slug: str, catalog_service: CatalogService = Depends(get_catalog_service)) -> ServiceOffer:
    try:
        return catalog_service.get_service_offer(slug)
    except ServiceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
