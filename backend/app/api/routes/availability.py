from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_availability_service
from app.core.config import get_settings
from app.domain.schemas import AvailabilityResponse
from app.services.artist_service import ArtistNotFoundError
from app.services.availability_service import AvailabilityService
from app.services.catalog_service import ServiceNotFoundError

router = APIRouter(prefix="/api/availability", tags=["availability"])


@router.get("", response_model=AvailabilityResponse)
def get_availability(
    service: str = Query(..., description="Service offer slug, e.g. 'first-time-manicure'"),
    artist: str = Query("any", description="'any' for the best available price, or a specific artist id"),
    days: int | None = Query(None, ge=1, le=60, description="How many days ahead to search"),
    availability_service: AvailabilityService = Depends(get_availability_service),
) -> AvailabilityResponse:
    search_days = days or get_settings().availability_search_days
    try:
        return availability_service.get_availability(service_slug=service, artist_selection=artist, days=search_days)
    except ServiceNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ArtistNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
