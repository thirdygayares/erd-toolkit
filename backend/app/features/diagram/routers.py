from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.features.diagram.schemas import (
    DiagramCreateRequest,
    DiagramDetailResponse,
    DiagramSummary,
    SnapshotCreateRequest,
    SnapshotResponse,
)
from app.features.diagram.services import DiagramService

router = APIRouter(tags=["diagram"])


def get_diagram_service() -> DiagramService:
    return DiagramService(get_db())


@router.post("/diagrams", response_model=DiagramSummary, status_code=status.HTTP_201_CREATED)
def create_diagram(
    payload: DiagramCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: DiagramService = Depends(get_diagram_service),
) -> DiagramSummary:
    return DiagramSummary(**service.create_diagram(payload, ctx))


@router.get("/workspaces/{workspace_id}/diagrams", response_model=list[DiagramSummary])
def list_diagrams_by_workspace(
    workspace_id: str,
    ctx: RequestContext = Depends(get_request_context),
    service: DiagramService = Depends(get_diagram_service),
) -> list[DiagramSummary]:
    rows = service.list_diagrams_by_workspace(workspace_id, ctx)
    return [DiagramSummary(**row) for row in rows]


@router.get("/diagrams/{diagram_id}", response_model=DiagramDetailResponse)
def get_diagram(
    diagram_id: str,
    ctx: RequestContext = Depends(get_request_context),
    service: DiagramService = Depends(get_diagram_service),
) -> DiagramDetailResponse:
    payload = service.get_diagram_detail(diagram_id, ctx)
    return DiagramDetailResponse(**payload)


@router.post(
    "/diagrams/{diagram_id}/snapshots",
    response_model=SnapshotResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_snapshot(
    diagram_id: str,
    payload: SnapshotCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: DiagramService = Depends(get_diagram_service),
) -> SnapshotResponse:
    return SnapshotResponse(**service.create_snapshot(diagram_id, payload, ctx))
