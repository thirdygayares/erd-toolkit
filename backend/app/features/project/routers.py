from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.features.project.schemas import (
    ProjectCreateRequest,
    ProjectDuplicateRequest,
    ProjectListResponse,
    ProjectResponse,
    ProjectUpdateRequest,
    ProjectVisibilityUpdateRequest,
)
from app.features.project.services import ProjectService

router = APIRouter(tags=["project"])


def get_project_service() -> ProjectService:
    return ProjectService(get_db())


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return ProjectResponse(**service.create_project(payload, ctx))


@router.get("/projects", response_model=list[ProjectListResponse])
def list_projects(
    ctx: RequestContext = Depends(get_request_context),
    service: ProjectService = Depends(get_project_service),
) -> list[ProjectListResponse]:
    projects = service.list_projects(ctx)
    return [ProjectListResponse(**p) for p in projects]


@router.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    ctx: RequestContext = Depends(get_request_context),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return ProjectResponse(**service.get_project(project_id, ctx))


@router.patch("/projects/{project_id}/visibility", response_model=ProjectResponse)
def set_project_visibility(
    project_id: str,
    payload: ProjectVisibilityUpdateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return ProjectResponse(**service.set_visibility(project_id, payload, ctx))


@router.patch("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    payload: ProjectUpdateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return ProjectResponse(**service.update_project(project_id, payload, ctx))


@router.get("/share/{share_slug}", response_model=ProjectResponse)
def get_project_by_share_slug(
    share_slug: str,
    ctx: RequestContext = Depends(get_request_context),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return ProjectResponse(**service.get_project_by_share_slug(share_slug, ctx))


@router.post("/projects/{project_id}/duplicate", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def duplicate_project(
    project_id: str,
    payload: ProjectDuplicateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: ProjectService = Depends(get_project_service),
) -> ProjectResponse:
    return ProjectResponse(**service.duplicate_project(project_id, payload.name, ctx))
