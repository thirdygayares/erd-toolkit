from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class ExportSqlRequest(BaseModel):
    target_schema: str = Field(default="public", min_length=1)
    source_schema_names: list[str] = Field(default_factory=list)
    export_all_schemas: bool = True


class ExportSqlResponse(BaseModel):
    export_job_id: UUID
    status: str
    statement_count: int
    sql_output: str
