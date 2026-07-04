from fastapi import APIRouter, Depends

from app.api.deps import get_artist_service, get_catalog_service
from app.domain.schemas import Artist
from app.services.artist_service import ArtistService
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/api/artists", tags=["artists"])


@router.get("", response_model=list[Artist])
def list_artists(
    artist_service: ArtistService = Depends(get_artist_service),
    catalog_service: CatalogService = Depends(get_catalog_service),
) -> list[Artist]:
    cart_menu = catalog_service.get_cart_menu()
    return artist_service.list_artists([cart_menu.manicure, cart_menu.pedicure])
