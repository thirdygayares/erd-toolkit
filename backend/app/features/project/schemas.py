from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    workspace_id: UUID
    name: str = Field(min_length=2, max_length=140)
    visibility: str = Field(default="public", pattern="^(public|private)$")
    description: str | None = None
    allow_anonymous_edit: bool = True
    share_slug: str | None = None


class ProjectVisibilityUpdateRequest(BaseModel):
    visibility: str = Field(pattern="^(public|private)$")
    allow_anonymous_edit: bool = False


class ProjectResponse(BaseModel):
    project_id: UUID
    workspace_id: UUID
    owner_user_id: UUID | None
    name: str
    description: str | None
    visibility: str
    share_slug: str | None
    allow_anonymous_edit: bool
    is_archived: bool
    created_at: datetime
    updated_at: datetime
