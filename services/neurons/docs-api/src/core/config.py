"""Service-specific configuration for docs-api."""

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    DATABASE_URL: str = Field(..., env="DATABASE_URL")
    DEBUG: bool = Field(False, env="DEBUG")
    DATABASE_POOL_SIZE: int = Field(5, env="DATABASE_POOL_SIZE")
    DATABASE_MAX_OVERFLOW: int = Field(10, env="DATABASE_MAX_OVERFLOW")


settings = Settings()

