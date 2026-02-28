from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.features.export.schemas import ExportSqlRequest, ExportSqlResponse
from app.features.export.services import ExportService

router = APIRouter(tags=["export"])


def get_export_service() -> ExportService:
    return ExportService(get_db())


@router.post(
    "/diagrams/{diagram_id}/export/sql",
    response_model=ExportSqlResponse,
    status_code=status.HTTP_201_CREATED,
)
def export_sql(
    diagram_id: str,
    payload: ExportSqlRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: ExportService = Depends(get_export_service),
) -> ExportSqlResponse:
    return ExportSqlResponse(**service.export_sql(diagram_id, payload, ctx))
