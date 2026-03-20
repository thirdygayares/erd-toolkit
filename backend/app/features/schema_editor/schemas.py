from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


def _normalize_required_text(value: str) -> str:
    normalized = value.strip()
    if not normalized:
        raise ValueError("value must not be blank")
    return normalized


def _normalize_enum_values(values: list[str]) -> list[str]:
    normalized = [value.strip() for value in values]
    if not normalized:
        raise ValueError("enum_values must not be empty")
    if any(not value for value in normalized):
        raise ValueError("enum_values must not contain blanks")
    if len(set(normalized)) != len(normalized):
        raise ValueError("enum_values must be unique")
    return normalized


class TableCreateRequest(BaseModel):
    schema_name: str = Field(default="public", min_length=1, max_length=63)
    table_name: str = Field(min_length=1, max_length=63)
    display_name: str | None = None
    comment_text: str | None = None
    pos_x: float = 0
    pos_y: float = 0
    color_hex: str | None = None


class TableUpdateRequest(BaseModel):
    schema_name: str | None = Field(default=None, min_length=1, max_length=63)
    table_name: str | None = Field(default=None, min_length=1, max_length=63)
    display_name: str | None = None
    comment_text: str | None = None
    pos_x: float | None = None
    pos_y: float | None = None
    color_hex: str | None = None
    is_deleted: bool | None = None


class TableMutationResponse(BaseModel):
    table_id: UUID
    diagram_id: UUID
    schema_name: str
    table_name: str
    display_name: str | None
    comment_text: str | None = None
    pos_x: float
    pos_y: float
    color_hex: str | None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime


class ColumnCreateRequest(BaseModel):
    column_name: str = Field(min_length=1, max_length=63)
    ordinal_position: int = Field(ge=1)
    data_type: str = Field(min_length=1)
    udt_name: str | None = None
    is_nullable: bool = True
    default_sql: str | None = None
    is_primary_key: bool = False
    is_unique: bool = False
    example_value: str | None = None
    ui_width: float | None = Field(default=None, gt=0)
    comment_text: str | None = None


class ColumnUpdateRequest(BaseModel):
    column_name: str | None = Field(default=None, min_length=1, max_length=63)
    ordinal_position: int | None = Field(default=None, ge=1)
    data_type: str | None = None
    udt_name: str | None = None
    is_nullable: bool | None = None
    default_sql: str | None = None
    is_primary_key: bool | None = None
    is_unique: bool | None = None
    example_value: str | None = None
    ui_width: float | None = Field(default=None, gt=0)
    comment_text: str | None = None


class ColumnMutationResponse(BaseModel):
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
    ui_width: float | None = None
    comment_text: str | None = None
    created_at: datetime
    updated_at: datetime


class CustomTypeCreateRequest(BaseModel):
    schema_name: str = Field(default="public", min_length=1, max_length=63)
    type_name: str = Field(min_length=1, max_length=63)
    enum_values: list[str] = Field(min_length=1)

    @field_validator("schema_name", "type_name")
    @classmethod
    def _validate_required_text(cls, value: str) -> str:
        return _normalize_required_text(value)

    @field_validator("enum_values")
    @classmethod
    def _validate_enum_values(cls, value: list[str]) -> list[str]:
        return _normalize_enum_values(value)


class CustomTypeUpdateRequest(BaseModel):
    schema_name: str | None = Field(default=None, min_length=1, max_length=63)
    type_name: str | None = Field(default=None, min_length=1, max_length=63)
    enum_values: list[str] | None = None

    @field_validator("schema_name", "type_name")
    @classmethod
    def _validate_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return _normalize_required_text(value)

    @field_validator("enum_values")
    @classmethod
    def _validate_optional_enum_values(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return value
        return _normalize_enum_values(value)


class CustomTypeResponse(BaseModel):
    custom_type_id: UUID
    diagram_id: UUID
    schema_name: str
    type_name: str
    kind: str
    enum_values: list[str]
    created_at: datetime
    updated_at: datetime


class RelationshipCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=140)
    from_table_id: UUID
    from_column_id: UUID
    to_table_id: UUID
    to_column_id: UUID
    cardinality_from: str = Field(default="N", pattern="^(1|N)$")
    cardinality_to: str = Field(default="1", pattern="^(1|N)$")
    on_update_action: str = "NO ACTION"
    on_delete_action: str = "NO ACTION"
    is_identifying: bool = False


class RelationshipUpdateRequest(BaseModel):
    name: str | None = None
    from_table_id: UUID | None = None
    from_column_id: UUID | None = None
    to_table_id: UUID | None = None
    to_column_id: UUID | None = None
    cardinality_from: str | None = Field(default=None, pattern="^(1|N)$")
    cardinality_to: str | None = Field(default=None, pattern="^(1|N)$")
    on_update_action: str | None = None
    on_delete_action: str | None = None
    is_identifying: bool | None = None


class RelationshipMutationResponse(BaseModel):
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
    is_identifying: bool
    created_at: datetime
    updated_at: datetime
