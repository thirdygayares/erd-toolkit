from __future__ import annotations

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import NotFoundError
from app.features.schema_editor import sql
from app.features.schema_editor.schemas import (
    ColumnCreateRequest,
    ColumnUpdateRequest,
    RelationshipCreateRequest,
    RelationshipUpdateRequest,
    TableCreateRequest,
    TableUpdateRequest,
)


class SchemaEditorService:
    def __init__(self, db: Database) -> None:
        self.db = db

    def create_table(self, diagram_id: str, payload: TableCreateRequest, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.INSERT_TABLE,
                    {
                        "diagram_id": diagram_id,
                        "schema_name": payload.schema_name,
                        "table_name": payload.table_name,
                        "display_name": payload.display_name,
                        "pos_x": payload.pos_x,
                        "pos_y": payload.pos_y,
                        "color_hex": payload.color_hex,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("unable to create table")
                return row

    def update_table(
        self,
        diagram_id: str,
        table_id: str,
        payload: TableUpdateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.UPDATE_TABLE,
                    {
                        "diagram_id": diagram_id,
                        "table_id": table_id,
                        "display_name": payload.display_name,
                        "pos_x": payload.pos_x,
                        "pos_y": payload.pos_y,
                        "color_hex": payload.color_hex,
                        "is_deleted": payload.is_deleted,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("table not found")
                return row

    def create_column(
        self,
        table_id: str,
        payload: ColumnCreateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.INSERT_COLUMN,
                    {
                        "table_id": table_id,
                        "column_name": payload.column_name,
                        "ordinal_position": payload.ordinal_position,
                        "data_type": payload.data_type,
                        "udt_name": payload.udt_name,
                        "is_nullable": payload.is_nullable,
                        "default_sql": payload.default_sql,
                        "is_primary_key": payload.is_primary_key,
                        "is_unique": payload.is_unique,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("unable to create column")
                return row

    def update_column(
        self,
        table_id: str,
        column_id: str,
        payload: ColumnUpdateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.UPDATE_COLUMN,
                    {
                        "table_id": table_id,
                        "column_id": column_id,
                        "column_name": payload.column_name,
                        "ordinal_position": payload.ordinal_position,
                        "data_type": payload.data_type,
                        "udt_name": payload.udt_name,
                        "is_nullable": payload.is_nullable,
                        "default_sql": payload.default_sql,
                        "is_primary_key": payload.is_primary_key,
                        "is_unique": payload.is_unique,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("column not found")
                return row

    def create_relationship(
        self,
        diagram_id: str,
        payload: RelationshipCreateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.INSERT_RELATIONSHIP,
                    {
                        "diagram_id": diagram_id,
                        "name": payload.name,
                        "from_table_id": str(payload.from_table_id),
                        "from_column_id": str(payload.from_column_id),
                        "to_table_id": str(payload.to_table_id),
                        "to_column_id": str(payload.to_column_id),
                        "cardinality_from": payload.cardinality_from,
                        "cardinality_to": payload.cardinality_to,
                        "on_update_action": payload.on_update_action,
                        "on_delete_action": payload.on_delete_action,
                        "is_identifying": payload.is_identifying,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("unable to create relationship")
                return row

    def update_relationship(
        self,
        diagram_id: str,
        relationship_id: str,
        payload: RelationshipUpdateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.UPDATE_RELATIONSHIP,
                    {
                        "diagram_id": diagram_id,
                        "relationship_id": relationship_id,
                        "name": payload.name,
                        "from_table_id": str(payload.from_table_id) if payload.from_table_id else None,
                        "from_column_id": str(payload.from_column_id) if payload.from_column_id else None,
                        "to_table_id": str(payload.to_table_id) if payload.to_table_id else None,
                        "to_column_id": str(payload.to_column_id) if payload.to_column_id else None,
                        "cardinality_from": payload.cardinality_from,
                        "cardinality_to": payload.cardinality_to,
                        "on_update_action": payload.on_update_action,
                        "on_delete_action": payload.on_delete_action,
                        "is_identifying": payload.is_identifying,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("relationship not found")
                return row

    def delete_relationship(
        self,
        diagram_id: str,
        relationship_id: str,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.DELETE_RELATIONSHIP,
                    {
                        "diagram_id": diagram_id,
                        "relationship_id": relationship_id,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("relationship not found")
                return row
