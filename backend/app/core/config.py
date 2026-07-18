from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Square
    square_environment: str = "sandbox"  # "sandbox" | "production"
    square_access_token: str
    square_location_id: str

    # App
    app_name: str = "AK.LUX.NAILS Booking API"
    log_level: str = "INFO"
    cors_allow_origins: str = "http://localhost:5173"

    # Booking behaviour
    availability_search_days: int = 14
    availability_cache_seconds: int = 30
    catalog_cache_seconds: int = 300

    # Future integrations (all optional / no-op until configured)
    mailchimp_api_key: str | None = None
    mailchimp_audience_id: str | None = None

    # Cloudflare Turnstile (invisible bot check on booking submission) — optional: verification
    # is skipped (with a warning log) until this is set, so abuse-guard deploys don't have to
    # wait on a Cloudflare account being created first.
    turnstile_secret_key: str | None = None

    # Marketing tracking DB (shared Postgres instance, dedicated "marketing" schema)
    marketing_db_host: str = "postgres"
    marketing_db_port: int = 5432
    marketing_db_name: str = "salonreview"
    marketing_db_user: str = "salon"
    marketing_db_password: str = ""

    # salaryReview's internal API (Telegram 4-hand-request relay) — reached over the same private
    # Docker network already joined for the marketing DB above. Blank = silently skip the alert.
    internal_api_base_url: str | None = None  # e.g. "http://backend:8080"
    internal_api_key: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
