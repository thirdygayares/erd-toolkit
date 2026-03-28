from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


APP_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = APP_DIR.parent


class Settings(BaseSettings):
    app_name: str = "erd-toolkit-backend"
    api_prefix: str = "/api/v1"

    db_host: str = "localhost"
    db_port: int = 5432
    db_name: str = "erd_toolkit"
    db_user: str = "joseiiigayares"
    db_password: str = ""

    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"
    cors_allow_credentials: bool = True

    auth_jwt_access_secret: str
    auth_access_ttl_minutes: int = 15
    auth_refresh_ttl_days: int = 30
    auth_oauth_state_ttl_minutes: int = 10
    auth_frontend_base_url: str = "http://localhost:3000"
    auth_cookie_domain: str | None = None
    auth_cookie_secure: bool = False
    auth_cookie_samesite: str = "lax"
    auth_email_verification_required: bool = False
    auth_google_client_id: str = ""
    auth_google_client_secret: str = ""
    auth_google_redirect_uri: str | None = None
    auth_github_client_id: str = ""
    auth_github_client_secret: str = ""
    auth_github_redirect_uri: str | None = None
    auth_lock_after_failed_attempts: int = 5
    auth_lock_minutes: int = 15

    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", APP_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("auth_cookie_domain", mode="before")
    @classmethod
    def normalize_cookie_domain(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = str(value).strip()
        return cleaned or None

    @field_validator("auth_cookie_samesite", mode="before")
    @classmethod
    def normalize_cookie_samesite(cls, value: str) -> str:
        cleaned = str(value).strip().lower()
        if cleaned not in {"lax", "strict", "none"}:
            raise ValueError("auth_cookie_samesite must be one of: lax, strict, none")
        return cleaned

    @model_validator(mode="after")
    def validate_auth_cookie_settings(self) -> "Settings":
        if self.auth_refresh_ttl_days < 1:
            raise ValueError("auth_refresh_ttl_days must be at least 1 day")

        if self.auth_cookie_samesite == "none" and not self.auth_cookie_secure:
            raise ValueError(
                "auth_cookie_secure must be true when auth_cookie_samesite is 'none'",
            )

        return self

    @property
    def database_dsn(self) -> str:
        if self.db_password:
            return (
                f"host={self.db_host} port={self.db_port} dbname={self.db_name} "
                f"user={self.db_user} password={self.db_password}"
            )
        return (
            f"host={self.db_host} port={self.db_port} dbname={self.db_name} "
            f"user={self.db_user}"
        )

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [origin.strip() for origin in self.cors_origins.split(",")]
        return [origin for origin in origins if origin]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
