from __future__ import annotations

from psycopg import Error as PsycopgError
from psycopg.errors import InvalidTextRepresentation, UndefinedFunction, UniqueViolation

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.features.schema_editor import sql
from app.features.schema_editor.schemas import (
    ColumnCreateRequest,
    ColumnUpdateRequest,
    CustomTypeCreateRequest,
    CustomTypeUpdateRequest,
    IndexCreateRequest,
    IndexUpdateRequest,
    RelationshipCreateRequest,
    RelationshipUpdateRequest,
    TableCreateRequest,
    TableUpdateRequest,
)


class SchemaEditorService:
    def __init__(self, db: Database) -> None:
        self.db = db

    @staticmethod
    def _normalize_column_row(row: dict | None) -> dict | None:
        if not row:
            return row
        payload = dict(row)
        payload.setdefault("example_value", None)
        payload.setdefault("ui_width", None)
        return payload

    @staticmethod
    def _normalize_index_row(row: dict | None) -> dict | None:
        if not row:
            return row
        payload = dict(row)
        payload["index_id"] = str(payload.get("index_id", ""))
        payload["method"] = str(payload.get("method") or "btree").lower()
        payload.setdefault("comment_text", None)
        payload.setdefault("source", "user")
        payload.setdefault("column_ids", [])
        payload.setdefault("column_names", [])
        return payload

    @staticmethod
    def _map_index_error(exc: PsycopgError) -> None:
        message = (str(exc).splitlines() or [""])[0].strip()

        if isinstance(exc, UniqueViolation) or "INDEX_NAME_CONFLICT" in message:
            raise ConflictError("INDEX_NAME_CONFLICT") from exc
        if "INDEX_SIGNATURE_DUPLICATE" in message:
            raise ConflictError("INDEX_SIGNATURE_DUPLICATE") from exc
        if "INDEX_SYSTEM_LOCKED" in message:
            raise ForbiddenError("INDEX_SYSTEM_LOCKED") from exc
        if "INDEX_TYPE_UNSUPPORTED" in message:
            raise ValidationError("INDEX_TYPE_UNSUPPORTED") from exc
        if "INDEX_COLUMN_NOT_FOUND" in message:
            raise ValidationError("INDEX_COLUMN_NOT_FOUND") from exc
        if "INDEX_COLUMN_DUPLICATE" in message:
            raise ValidationError("INDEX_COLUMN_DUPLICATE") from exc
        if "INDEX_COLUMN_REQUIRED" in message:
            raise ValidationError("INDEX_COLUMN_REQUIRED") from exc
        if "INDEX_NAME_REQUIRED" in message:
            raise ValidationError("INDEX_NAME_REQUIRED") from exc
        if isinstance(exc, InvalidTextRepresentation):
            raise ValidationError("INDEX_ID_INVALID") from exc

        raise exc

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
                        "comment_text": payload.comment_text,
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
                        "schema_name": payload.schema_name,
                        "table_name": payload.table_name,
                        "display_name": payload.display_name,
                        "comment_text": payload.comment_text,
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
                params = {
                    "table_id": table_id,
                    "column_name": payload.column_name,
                    "ordinal_position": payload.ordinal_position,
                    "data_type": payload.data_type,
                    "udt_name": payload.udt_name,
                    "is_nullable": payload.is_nullable,
                    "default_sql": payload.default_sql,
                    "is_primary_key": payload.is_primary_key,
                    "is_unique": payload.is_unique,
                    "example_value": payload.example_value,
                    "ui_width": payload.ui_width,
                    "comment_text": payload.comment_text,
                }
                try:
                    cur.execute(sql.INSERT_COLUMN, params)
                except UndefinedFunction:
                    # Backward compatibility for DBs that do not yet support ui_width.
                    try:
                        cur.execute(sql.INSERT_COLUMN_LEGACY_WITH_EXAMPLE_COMMENT, params)
                    except UndefinedFunction:
                        # Older deployments may still have the legacy 9-arg function.
                        cur.execute(sql.INSERT_COLUMN_LEGACY, params)

                row = self._normalize_column_row(cur.fetchone())
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
                params = {
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
                    "example_value": payload.example_value,
                    "ui_width": payload.ui_width,
                    "comment_text": payload.comment_text,
                }
                try:
                    cur.execute(sql.UPDATE_COLUMN, params)
                except UndefinedFunction:
                    # Backward compatibility for DBs that do not yet support ui_width.
                    try:
                        cur.execute(sql.UPDATE_COLUMN_LEGACY_WITH_EXAMPLE_COMMENT, params)
                    except UndefinedFunction:
                        # Older deployments may still have the legacy 10-arg function.
                        cur.execute(sql.UPDATE_COLUMN_LEGACY, params)

                row = self._normalize_column_row(cur.fetchone())
                if not row:
                    raise NotFoundError("column not found")
                return row

    def delete_column(
        self,
        table_id: str,
        column_id: str,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.DELETE_COLUMN,
                    {
                        "table_id": table_id,
                        "column_id": column_id,
                    },
                )
                row = self._normalize_column_row(cur.fetchone())
                if not row:
                    raise NotFoundError("column not found")
                return row

    def create_custom_type(
        self,
        diagram_id: str,
        payload: CustomTypeCreateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.INSERT_CUSTOM_TYPE,
                    {
                        "diagram_id": diagram_id,
                        "schema_name": payload.schema_name,
                        "type_name": payload.type_name,
                        "enum_values": payload.enum_values,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("unable to create custom type")
                return row

    def update_custom_type(
        self,
        diagram_id: str,
        custom_type_id: str,
        payload: CustomTypeUpdateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.UPDATE_CUSTOM_TYPE,
                    {
                        "diagram_id": diagram_id,
                        "custom_type_id": custom_type_id,
                        "schema_name": payload.schema_name,
                        "type_name": payload.type_name,
                        "enum_values": payload.enum_values,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("custom type not found")
                return row

    def delete_custom_type(
        self,
        diagram_id: str,
        custom_type_id: str,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.DELETE_CUSTOM_TYPE,
                    {
                        "diagram_id": diagram_id,
                        "custom_type_id": custom_type_id,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("custom type not found")
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

    def create_index(
        self,
        table_id: str,
        payload: IndexCreateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                try:
                    cur.execute(
                        sql.INSERT_INDEX,
                        {
                            "table_id": table_id,
                            "index_name": payload.index_name,
                            "method": payload.method,
                            "is_unique": payload.is_unique,
                            "comment_text": payload.comment_text,
                            "column_ids": [str(column_id) for column_id in payload.column_ids],
                        },
                    )
                except PsycopgError as exc:
                    self._map_index_error(exc)

                row = self._normalize_index_row(cur.fetchone())
                if not row:
                    raise NotFoundError("unable to create index")
                return row

    def update_index(
        self,
        table_id: str,
        index_id: str,
        payload: IndexUpdateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                try:
                    cur.execute(
                        sql.UPDATE_INDEX,
                        {
                            "table_id": table_id,
                            "index_id": index_id,
                            "index_name": payload.index_name,
                            "method": payload.method,
                            "is_unique": payload.is_unique,
                            "comment_text": payload.comment_text,
                            "column_ids": [str(column_id) for column_id in payload.column_ids],
                        },
                    )
                except PsycopgError as exc:
                    self._map_index_error(exc)

                row = self._normalize_index_row(cur.fetchone())
                if not row:
                    raise NotFoundError("index not found")
                return row

    def delete_index(
        self,
        table_id: str,
        index_id: str,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                try:
                    cur.execute(
                        sql.DELETE_INDEX,
                        {
                            "table_id": table_id,
                            "index_id": index_id,
                        },
                    )
                except PsycopgError as exc:
                    self._map_index_error(exc)

                row = self._normalize_index_row(cur.fetchone())
                if not row:
                    raise NotFoundError("index not found")
                return row
