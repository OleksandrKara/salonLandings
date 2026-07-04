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

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_allow_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
