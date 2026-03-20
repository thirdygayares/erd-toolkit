from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class DiagramCreateRequest(BaseModel):
    workspace_id: UUID
    project_id: UUID
    name: str = Field(min_length=2, max_length=140)
    description: str | None = None


class DiagramSummary(BaseModel):
    diagram_id: UUID
    workspace_id: UUID
    project_id: UUID
    name: str
    description: str | None
    version_no: int
    viewport_x: float
    viewport_y: float
    viewport_zoom: float
    created_at: datetime
    updated_at: datetime


class ColumnResponse(BaseModel):
    column_id: UUID
    table_id: UUID
    column_name: str
    ordinal_position: int
    data_type: str
    udt_name: str | None
    is_nullable: bool
    default_sql: str | None
    is_primary_key: bool
    is_unique: bool
    example_value: str | None = None


class CustomTypeResponse(BaseModel):
    custom_type_id: UUID
    diagram_id: UUID
    schema_name: str
    type_name: str
    kind: str
    enum_values: list[str]
    created_at: datetime
    updated_at: datetime


class TableResponse(BaseModel):
    table_id: UUID
    diagram_id: UUID
    schema_name: str
    table_name: str
    display_name: str | None
    pos_x: float
    pos_y: float
    width: float | None
    height: float | None
    color_hex: str | None
    columns: list[ColumnResponse]


class RelationshipResponse(BaseModel):
    relationship_id: UUID
    diagram_id: UUID
    name: str
    from_table_id: UUID
    from_column_id: UUID
    to_table_id: UUID
    to_column_id: UUID
    cardinality_from: str
    cardinality_to: str
    on_update_action: str
    on_delete_action: str


class DiagramDetailResponse(BaseModel):
    diagram: DiagramSummary
    tables: list[TableResponse]
    relationships: list[RelationshipResponse]
    custom_types: list[CustomTypeResponse]


class SnapshotCreateRequest(BaseModel):
    label: str | None = None
    snapshot_payload: dict = Field(default_factory=dict)


class SnapshotResponse(BaseModel):
    snapshot_id: UUID
    diagram_id: UUID
    version_no: int
    label: str | None
    snapshot_payload: dict
    created_at: datetime
