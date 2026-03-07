from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.features.workspace.schemas import (
    WorkspaceCreateRequest,
    WorkspaceEnsureDefaultResponse,
    WorkspaceListResponse,
    WorkspaceResponse,
)
from app.features.workspace.services import WorkspaceService

router = APIRouter(prefix="/workspaces", tags=["workspace"])


def get_workspace_service() -> WorkspaceService:
    return WorkspaceService(get_db())


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(
    payload: WorkspaceCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceResponse:
    return WorkspaceResponse(**service.create_workspace(payload, ctx))


@router.get("", response_model=list[WorkspaceListResponse])
def list_workspaces(
    ctx: RequestContext = Depends(get_request_context),
    service: WorkspaceService = Depends(get_workspace_service),
) -> list[WorkspaceListResponse]:
    workspaces = service.list_workspaces(ctx)
    return [WorkspaceListResponse(**w) for w in workspaces]


@router.post("/ensure-default", response_model=WorkspaceEnsureDefaultResponse, status_code=status.HTTP_200_OK)
def ensure_default_workspace(
    ctx: RequestContext = Depends(get_request_context),
    service: WorkspaceService = Depends(get_workspace_service),
) -> WorkspaceEnsureDefaultResponse:
    return WorkspaceEnsureDefaultResponse(**service.ensure_default_workspace(ctx))
