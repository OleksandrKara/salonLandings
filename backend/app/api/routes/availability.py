from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_availability_service
from app.core.config import get_settings
from app.domain.schemas import AvailabilityResponse
from app.services.artist_service import ArtistNotFoundError
from app.services.availability_service import AvailabilityService, InvalidCartError, NoEligibleArtistError
from app.services.catalog_service import ServiceNotFoundError

router = APIRouter(prefix="/api/availability", tags=["availability"])


@router.get("", response_model=AvailabilityResponse)
def get_availability(
    services: str = Query(..., description="Comma-separated service slugs, e.g. 'manicure,pedicure'"),
    artist: str = Query("any", description="'any' for the best available price, or a specific artist id"),
    days: int | None = Query(
        None, ge=1, le=32, description="How many days ahead to search (Square caps this range at 32 days)"
    ),
    availability_service: AvailabilityService = Depends(get_availability_service),
) -> AvailabilityResponse:
    service_slugs = [s.strip() for s in services.split(",") if s.strip()]
    search_days = days or get_settings().availability_search_days
    try:
        return availability_service.get_availability(service_slugs=service_slugs, artist_selection=artist, days=search_days)
    except (ServiceNotFoundError, InvalidCartError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (ArtistNotFoundError, NoEligibleArtistError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
