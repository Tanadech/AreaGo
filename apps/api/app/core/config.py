"""Application settings, loaded from environment variables via pydantic-settings v2."""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated, Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

EnvName = Literal["dev", "uat", "prod"]


class Settings(BaseSettings):
    """Typed application configuration.

    Values are read from the process environment (and a local ``.env`` during
    development). Variable names match the canonical contract exactly.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Runtime environment
    ENV: EnvName = "dev"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://areascan:areascan@db:5432/areascan"
    SYNC_DATABASE_URL: str = "postgresql+psycopg://areascan:areascan@db:5432/areascan"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth / JWT
    JWT_SECRET: str = "change-me-in-production"
    ACCESS_TOKEN_TTL_MIN: int = 15
    REFRESH_TOKEN_TTL_DAYS: int = 7

    # Refresh-token cookie. Defaults are dev-safe (no Secure flag, host-only).
    # In production set COOKIE_SECURE=true and (optionally) COOKIE_DOMAIN.
    REFRESH_COOKIE_NAME: str = "refresh_token"
    COOKIE_SECURE: bool = False
    COOKIE_DOMAIN: str | None = None

    # CORS — comma-separated string in env, parsed to a list.
    # NoDecode disables pydantic-settings' source-level JSON decoding so the
    # validator below receives the raw string (a bare comma list is not JSON).
    CORS_ORIGINS: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:3000"]
    )

    # Third-party integrations
    ANTHROPIC_API_KEY: str | None = None
    GOOGLE_MAPS_SERVER_KEY: str | None = None
    GOOGLE_OAUTH_CLIENT_ID: str | None = None

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        """Allow CORS_ORIGINS to be provided as a comma-separated string."""
        if isinstance(value, str):
            stripped = value.strip()
            if not stripped:
                return []
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value

    @property
    def is_prod(self) -> bool:
        return self.ENV == "prod"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance (one read of the environment)."""
    return Settings()
