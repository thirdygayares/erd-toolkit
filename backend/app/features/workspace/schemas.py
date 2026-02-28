from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    slug: str | None = None
    workspace_mode: str = Field(default="guest", pattern="^(shared|personal|guest)$")


class WorkspaceResponse(BaseModel):
    workspace_id: UUID
    name: str
    slug: str
    owner_user_id: UUID | None
    workspace_mode: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
