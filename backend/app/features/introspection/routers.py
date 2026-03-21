from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile, status

from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.features.introspection.schemas import (
    ImportPostgresRequest,
    ImportPostgresResponse,
    ImportSqlRawRequest,
    PostgresConnectionRequest,
    PostgresConnectionTestResponse,
    PostgresSchemaListResponse,
)
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


@router.post(
    "/diagrams/{diagram_id}/import/sql/raw",
    response_model=ImportPostgresResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_sql_raw(
    diagram_id: str,
    payload: ImportSqlRawRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: IntrospectionService = Depends(get_introspection_service),
) -> ImportPostgresResponse:
    return ImportPostgresResponse(**service.import_sql_raw(diagram_id, payload, ctx))


@router.post(
    "/diagrams/{diagram_id}/import/sql/file",
    response_model=ImportPostgresResponse,
    status_code=status.HTTP_201_CREATED,
)
def import_sql_file(
    diagram_id: str,
    file: UploadFile = File(...),
    ctx: RequestContext = Depends(get_request_context),
    service: IntrospectionService = Depends(get_introspection_service),
) -> ImportPostgresResponse:
    return ImportPostgresResponse(
        **service.import_sql_file(diagram_id, file.file.read(), file.filename, ctx)
    )


@router.post(
    "/diagrams/{diagram_id}/import/postgres/test",
    response_model=PostgresConnectionTestResponse,
)
def test_postgres_connection(
    diagram_id: str,
    payload: PostgresConnectionRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: IntrospectionService = Depends(get_introspection_service),
) -> PostgresConnectionTestResponse:
    return PostgresConnectionTestResponse(
        **service.test_postgres_connection(diagram_id, payload, ctx)
    )


@router.post(
    "/diagrams/{diagram_id}/import/postgres/schemas",
    response_model=PostgresSchemaListResponse,
)
def list_postgres_schemas(
    diagram_id: str,
    payload: PostgresConnectionRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: IntrospectionService = Depends(get_introspection_service),
) -> PostgresSchemaListResponse:
    return PostgresSchemaListResponse(**service.list_postgres_schemas(diagram_id, payload, ctx))
