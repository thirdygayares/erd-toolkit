from __future__ import annotations

from fastapi import APIRouter, Depends, status

from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.features.schema_editor.schemas import (
    ColumnCreateRequest,
    ColumnMutationResponse,
    ColumnUpdateRequest,
    CustomTypeCreateRequest,
    CustomTypeResponse,
    CustomTypeUpdateRequest,
    RelationshipCreateRequest,
    RelationshipMutationResponse,
    RelationshipUpdateRequest,
    TableCreateRequest,
    TableMutationResponse,
    TableUpdateRequest,
)
from app.features.schema_editor.services import SchemaEditorService

router = APIRouter(tags=["schema-editor"])


def get_schema_editor_service() -> SchemaEditorService:
    return SchemaEditorService(get_db())


@router.post(
    "/diagrams/{diagram_id}/tables",
    response_model=TableMutationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_table(
    diagram_id: str,
    payload: TableCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> TableMutationResponse:
    return TableMutationResponse(**service.create_table(diagram_id, payload, ctx))


@router.patch("/diagrams/{diagram_id}/tables/{table_id}", response_model=TableMutationResponse)
def update_table(
    diagram_id: str,
    table_id: str,
    payload: TableUpdateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> TableMutationResponse:
    return TableMutationResponse(**service.update_table(diagram_id, table_id, payload, ctx))


@router.post(
    "/diagrams/{diagram_id}/tables/{table_id}/columns",
    response_model=ColumnMutationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_column(
    diagram_id: str,
    table_id: str,
    payload: ColumnCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> ColumnMutationResponse:
    del diagram_id
    return ColumnMutationResponse(**service.create_column(table_id, payload, ctx))


@router.patch(
    "/diagrams/{diagram_id}/tables/{table_id}/columns/{column_id}",
    response_model=ColumnMutationResponse,
)
def update_column(
    diagram_id: str,
    table_id: str,
    column_id: str,
    payload: ColumnUpdateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> ColumnMutationResponse:
    del diagram_id
    return ColumnMutationResponse(**service.update_column(table_id, column_id, payload, ctx))


@router.delete(
    "/diagrams/{diagram_id}/tables/{table_id}/columns/{column_id}",
    response_model=ColumnMutationResponse,
)
def delete_column(
    diagram_id: str,
    table_id: str,
    column_id: str,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> ColumnMutationResponse:
    del diagram_id
    return ColumnMutationResponse(**service.delete_column(table_id, column_id, ctx))


@router.post(
    "/diagrams/{diagram_id}/custom-types",
    response_model=CustomTypeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_custom_type(
    diagram_id: str,
    payload: CustomTypeCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> CustomTypeResponse:
    return CustomTypeResponse(**service.create_custom_type(diagram_id, payload, ctx))


@router.patch(
    "/diagrams/{diagram_id}/custom-types/{custom_type_id}",
    response_model=CustomTypeResponse,
)
def update_custom_type(
    diagram_id: str,
    custom_type_id: str,
    payload: CustomTypeUpdateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> CustomTypeResponse:
    return CustomTypeResponse(
        **service.update_custom_type(diagram_id, custom_type_id, payload, ctx)
    )


@router.delete(
    "/diagrams/{diagram_id}/custom-types/{custom_type_id}",
    response_model=CustomTypeResponse,
)
def delete_custom_type(
    diagram_id: str,
    custom_type_id: str,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> CustomTypeResponse:
    return CustomTypeResponse(**service.delete_custom_type(diagram_id, custom_type_id, ctx))


@router.post(
    "/diagrams/{diagram_id}/relationships",
    response_model=RelationshipMutationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_relationship(
    diagram_id: str,
    payload: RelationshipCreateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> RelationshipMutationResponse:
    return RelationshipMutationResponse(**service.create_relationship(diagram_id, payload, ctx))


@router.patch(
    "/diagrams/{diagram_id}/relationships/{relationship_id}",
    response_model=RelationshipMutationResponse,
)
def update_relationship(
    diagram_id: str,
    relationship_id: str,
    payload: RelationshipUpdateRequest,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> RelationshipMutationResponse:
    return RelationshipMutationResponse(
        **service.update_relationship(diagram_id, relationship_id, payload, ctx)
    )


@router.delete(
    "/diagrams/{diagram_id}/relationships/{relationship_id}",
    response_model=RelationshipMutationResponse,
)
def delete_relationship(
    diagram_id: str,
    relationship_id: str,
    ctx: RequestContext = Depends(get_request_context),
    service: SchemaEditorService = Depends(get_schema_editor_service),
) -> RelationshipMutationResponse:
    return RelationshipMutationResponse(
        **service.delete_relationship(diagram_id, relationship_id, ctx)
    )
