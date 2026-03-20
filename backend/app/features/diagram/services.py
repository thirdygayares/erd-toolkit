from __future__ import annotations

from collections import defaultdict

from psycopg.types.json import Jsonb

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import NotFoundError
from app.features.diagram import sql
from app.features.diagram.schemas import DiagramCreateRequest, SnapshotCreateRequest


class DiagramService:
    def __init__(self, db: Database) -> None:
        self.db = db

    def create_diagram(self, payload: DiagramCreateRequest, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.CREATE_DIAGRAM,
                    {
                        "workspace_id": str(payload.workspace_id),
                        "project_id": str(payload.project_id),
                        "name": payload.name,
                        "description": payload.description,
                        "actor_id": str(ctx.current_user_id) if ctx.current_user_id else None,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("unable to create diagram")
                return row

    def list_diagrams_by_workspace(self, workspace_id: str, ctx: RequestContext) -> list[dict]:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.LIST_DIAGRAMS_BY_WORKSPACE, {"workspace_id": workspace_id})
                return cur.fetchall()

    def get_diagram_detail(self, diagram_id: str, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.GET_DIAGRAM, {"diagram_id": diagram_id})
                diagram = cur.fetchone()
                if not diagram:
                    raise NotFoundError("diagram not found")

                cur.execute(sql.GET_TABLES, {"diagram_id": diagram_id})
                raw_tables = cur.fetchall()
                tables: list[dict] = []
                for table in raw_tables:
                    normalized_table = dict(table)
                    normalized_table.setdefault("comment_text", None)
                    tables.append(normalized_table)

                cur.execute(sql.GET_COLUMNS_BY_DIAGRAM, {"diagram_id": diagram_id})
                raw_columns = cur.fetchall()
                columns: list[dict] = []
                for column in raw_columns:
                    normalized = dict(column)
                    normalized.setdefault("example_value", None)
                    normalized.setdefault("comment_text", None)
                    columns.append(normalized)

                cur.execute(sql.GET_RELATIONSHIPS, {"diagram_id": diagram_id})
                relationships = cur.fetchall()

                cur.execute(sql.GET_CUSTOM_TYPES, {"diagram_id": diagram_id})
                custom_types = cur.fetchall()

        columns_by_table: dict[str, list[dict]] = defaultdict(list)
        for col in columns:
            columns_by_table[str(col["table_id"])].append(col)

        table_payload = []
        for table in tables:
            table_payload.append({**table, "columns": columns_by_table.get(str(table["table_id"]), [])})

        return {
            "diagram": diagram,
            "tables": table_payload,
            "relationships": relationships,
            "custom_types": custom_types,
        }

    def create_snapshot(
        self,
        diagram_id: str,
        payload: SnapshotCreateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.CREATE_SNAPSHOT,
                    {
                        "diagram_id": diagram_id,
                        "label": payload.label,
                        "snapshot_payload": Jsonb(payload.snapshot_payload),
                        "actor_id": str(ctx.current_user_id) if ctx.current_user_id else None,
                    },
                )
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("unable to create snapshot")
                return row
