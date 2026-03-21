from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class PostgresConnectionRequest(BaseModel):
    host: str
    port: int = Field(default=5432, ge=1, le=65535)
    database_name: str
    username: str
    password: str
    ssl_mode: str = Field(default="prefer")
    connection_name: str | None = None


class PostgresConnectionTestResponse(BaseModel):
    status: str
    database_name: str
    current_user: str
    server_version: str


class PostgresSchemaListResponse(BaseModel):
    status: str
    schemas: list[str]
    default_schema: str


class ImportPostgresRequest(PostgresConnectionRequest):
    schema_name: str | None = None
    schema_names: list[str] = Field(default_factory=list)
    import_all_schemas: bool = False


class ImportPostgresResponse(BaseModel):
    import_job_id: UUID
    connection_id: UUID
    status: str
    table_count: int
    column_count: int
    relationship_count: int


class ImportSqlRawRequest(BaseModel):
    sql: str = Field(min_length=1)
