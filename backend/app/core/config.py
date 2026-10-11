"""
Application Configuration.

Loads environment variables from .env file and provides typed settings
using Pydantic Settings v2.
"""

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    All settings are validated at startup. If any required variable is
    missing or invalid, the application will fail fast.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ============================================
    # APPLICATION
    # ============================================
    APP_NAME: str = "German Waste Processor"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    DEBUG: bool = True
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    # ============================================
    # DATABASE
    # ============================================
    DATABASE_URL: str = Field(
        ...,
        description="PostgreSQL connection string (asyncpg driver)",
    )

    # ============================================
    # SECURITY & AUTHENTICATION
    # ============================================
    JWT_SECRET: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ============================================
    # INITIAL ADMIN
    # ============================================
    ADMIN_INITIAL_USERNAME: str = "admin"
    ADMIN_INITIAL_EMAIL: str = "admin@wdh.local"
    ADMIN_INITIAL_PASSWORD: str = Field(..., min_length=8)

    # ============================================
    # EMAIL (RESEND)
    # ============================================
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@wdh.local"
    EMAIL_FROM_NAME: str = "WDH Waste Processor"

    # ============================================
    # NOMINATIM (Address Validation)
    # ============================================
    NOMINATIM_BASE_URL: str = "https://nominatim.openstreetmap.org"
    NOMINATIM_USER_AGENT: str = "german-waste-processor/1.0"
    NOMINATIM_TIMEOUT_SECONDS: int = 5

    # ============================================
    # HUGGINGFACE (AI Fallback)
    # ============================================
    HUGGINGFACE_API_KEY: str = ""
    HUGGINGFACE_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # ============================================
    # PROXY POOL (Layer 2)
    # ============================================
    PROXY_POOL_ENABLED: bool = True
    PROXY_POOL_URL: str = ""

    # ============================================
    # SCRAPING
    # ============================================
    PLAYWRIGHT_HEADLESS: bool = True
    PLAYWRIGHT_TIMEOUT_MS: int = 7000
    SCRAPING_TIMEOUT_SECONDS: int = 45
    SCRAPING_MAX_RETRIES: int = 3

    # ============================================
    # CACHE
    # ============================================
    CACHE_TTL_DAYS: int = 7

    # ============================================
    # RATE LIMITING
    # ============================================
    RATE_LIMIT_PUBLIC_PER_MINUTE: int = 10
    RATE_LIMIT_ADMIN_PER_MINUTE: int = 60
    RATE_LIMIT_TEST_CONNECTION_PER_MINUTE: int = 10

    # ============================================
    # CORS
    # ============================================
    CORS_ORIGINS: str = "http://localhost:5500,http://127.0.0.1:5500"

    # ============================================
    # TIMEZONE
    # ============================================
    TIMEZONE: str = "Europe/Berlin"

    # ============================================
    # SERVER
    # ============================================
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors_origins(cls, v: str) -> str:
        """Validate CORS origins format."""
        if not v or v.strip() == "":
            return "http://localhost:5500"
        return v.strip()

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_production(self) -> bool:
        """Check if running in production."""
        return self.ENVIRONMENT == "production"

    @property
    def is_development(self) -> bool:
        """Check if running in development."""
        return self.ENVIRONMENT == "development"


@lru_cache
def get_settings() -> Settings:
    """
    Get application settings (cached).

    Returns:
        Settings: Application settings instance.
    """
    return Settings()


# Global settings instance
settings = get_settings()