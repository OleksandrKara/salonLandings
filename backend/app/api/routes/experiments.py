import logging

from fastapi import APIRouter, Depends

from app.api.deps import get_experiment_service
from app.services.experiment_service import ExperimentService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/experiments", tags=["experiments"])


@router.get("/{slug}")
async def get_experiment(
    slug: str,
    experiment_service: ExperimentService = Depends(get_experiment_service),
) -> dict:
    try:
        return await experiment_service.resolve_variants(slug)
    except Exception:
        # Must never break page load — fall back to "no experiment" so the caller renders
        # the hardcoded default content.
        logger.exception("Failed to resolve experiment for slug=%s", slug)
        return {"landing_page_id": None, "experiment_status": "none", "variants": []}
