import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import artists, availability, bookings, services
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.integrations.square.exceptions import SquareIntegrationError

configure_logging()
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(title=settings.app_name)

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


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}
