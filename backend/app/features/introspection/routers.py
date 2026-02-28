from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.features.introspection.schemas import ImportPostgresRequest, ImportPostgresResponse
from app.features.introspection.services import IntrospectionService

router = APIRouter(tags=["introspection"])


def get_introspection_service() -> IntrospectionService:
    return IntrospectionService(get_db())


@router.post(
    "/diagrams/{diagram_id}/import/postgres",
    response_model=ImportPostgresResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_postgres(
    diagram_id: str,
    payload: ImportPostgresRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: IntrospectionService = Depends(get_introspection_service),
) -> ImportPostgresResponse:
    return ImportPostgresResponse(**service.import_postgres(diagram_id, payload, ctx))
