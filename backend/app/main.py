import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.deps import _customer_attributes_gateway_for
from app.api.routes import artists, availability, bookings, calendar, contacts, experiments, pmu, promos, services, tracking
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.integrations.marketing_db.migrations import run_migrations
from app.integrations.marketing_db.pool import close_pool, init_pool
from app.integrations.square.exceptions import SquareIntegrationError

configure_logging()
logger = logging.getLogger(__name__)

settings = get_settings()


# Businesses this process creates Square bookings/customers for: 1 = AK.LUX.NAILS (mani),
# 2 = AK PMU (book.pmu-annakara.com, pmu-annakara.com).
_SQUARE_BUSINESS_IDS = (1, 2)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_pool()
    await run_migrations()
    # No request context at startup, so the usual `Depends(get_current_business)` chain can't
    # resolve here (2026-08-19 regression: calling the FastAPI-dependency wrapper directly passed
    # the raw Depends object through as "business", crashing on business.id) — call the
    # business_id-keyed cache helper directly instead. Square custom attribute definitions are
    # per Square account, so every business this process books for needs its own: business 2
    # (AK PMU) had none until 2026-10-05, so its customers' traffic source / consent fields were
    # silently never written to Square.
    for business_id in _SQUARE_BUSINESS_IDS:
        try:
            _customer_attributes_gateway_for(business_id=business_id).ensure_definitions()
        except Exception:
            # Non-fatal: definitions self-heal on the next restart, and bookings still succeed
            # without them (attach_tracking just logs and skips if they aren't there yet).
            logger.exception("Failed to ensure Square customer custom attribute definitions (business %s)", business_id)
    yield
    await close_pool()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SquareIntegrationError)
def handle_square_integration_error(request: Request, exc: SquareIntegrationError) -> JSONResponse:
    logger.error("Square integration error on %s: %s (detail=%s)", request.url.path, exc.message, exc.detail)
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})


app.include_router(services.router)
app.include_router(artists.router)
app.include_router(availability.router)
app.include_router(bookings.router)
app.include_router(tracking.router)
app.include_router(experiments.router)
app.include_router(contacts.router)
app.include_router(pmu.router)
app.include_router(promos.router)
app.include_router(calendar.router)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
