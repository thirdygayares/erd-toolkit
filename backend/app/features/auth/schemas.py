from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class EmailRegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=10, max_length=128)
    display_name: str | None = Field(default=None, max_length=120)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()

    @field_validator("display_name")
    @classmethod
    def normalize_display_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class EmailLoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.strip().lower()


class OAuthStartRequest(BaseModel):
    redirect_path: str | None = Field(default="/auth/callback", max_length=400)
    guest_workspace_id: UUID | None = None
    guest_project_id: UUID | None = None


class AuthUserResponse(BaseModel):
    user_id: UUID
    email: str
    display_name: str | None
    status: str
    primary_auth_provider: str
    email_verified_at: datetime | None
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AuthSessionResponse(BaseModel):
    user: AuthUserResponse
    session_id: UUID
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime


class AuthStatusResponse(BaseModel):
    user: AuthUserResponse


class OAuthStartResponse(BaseModel):
    provider: str
    authorization_url: str
    expires_at: datetime


class GuestClaimRequest(BaseModel):
    workspace_id: UUID


class GuestClaimResponse(BaseModel):
    workspace_id: UUID
    owner_user_id: UUID
    claim_status: str
    claimed_project_count: int
    updated_at: datetime


class LogoutResponse(BaseModel):
    detail: str
