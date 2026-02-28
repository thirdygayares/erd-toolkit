from __future__ import annotations

from collections import defaultdict

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import NotFoundError
from app.features.introspection import sql
from app.features.introspection.schemas import ImportPostgresRequest


class IntrospectionService:
    def __init__(self, db: Database) -> None:
        self.db = db

    def import_postgres(
        self,
        diagram_id: str,
        payload: ImportPostgresRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.GET_DIAGRAM_WORKSPACE, {"diagram_id": diagram_id})
                diagram = cur.fetchone()
                if not diagram:
                    raise NotFoundError("diagram not found")

                connection_name = payload.connection_name or f"{payload.host}:{payload.port}/{payload.database_name}"
                cur.execute(
                    sql.UPSERT_DB_CONNECTION,
                    {
                        "workspace_id": diagram["workspace_id"],
                        "name": connection_name,
                        "host": payload.host,
                        "port": payload.port,
                        "database_name": payload.database_name,
                        "username": payload.username,
                        "password_secret_ref": f"local://{connection_name}",
                        "ssl_mode": payload.ssl_mode,
                    },
                )
                connection_id = cur.fetchone()["connection_id"]

                cur.execute(
                    sql.CREATE_IMPORT_JOB,
                    {
                        "diagram_id": diagram_id,
                        "connection_id": connection_id,
                    },
                )
                import_job_id = cur.fetchone()["import_job_id"]

            try:
                summary = self._sync_schema(conn, diagram_id, payload)
                with conn.cursor() as cur:
                    cur.execute(
                        sql.MARK_IMPORT_JOB_SUCCESS,
                        {
                            "import_job_id": import_job_id,
                            "result_summary": Jsonb(summary),
                        },
                    )
            except Exception as exc:
                with conn.cursor() as cur:
                    cur.execute(
                        sql.MARK_IMPORT_JOB_FAILED,
                        {
                            "import_job_id": import_job_id,
                            "error_text": str(exc),
                        },
                    )
                raise

        return {
            "import_job_id": import_job_id,
            "connection_id": connection_id,
            "status": "success",
            **summary,
        }

    def _sync_schema(
        self,
        conn: psycopg.Connection,
        diagram_id: str,
        payload: ImportPostgresRequest,
    ) -> dict:
        source_dsn = (
            f"host={payload.host} port={payload.port} dbname={payload.database_name} "
            f"user={payload.username} password={payload.password} sslmode={payload.ssl_mode}"
        )

        with psycopg.connect(source_dsn, row_factory=dict_row) as source_conn:
            with source_conn.cursor() as src_cur:
                src_cur.execute(
                    """
                    SELECT table_schema, table_name
                    FROM information_schema.tables
                    WHERE table_type = 'BASE TABLE'
                      AND table_schema = %s
                    ORDER BY table_name;
                    """,
                    (payload.schema_name,),
                )
                source_tables = src_cur.fetchall()

                src_cur.execute(
                    """
                    SELECT table_name, column_name, ordinal_position, data_type,
                           udt_name, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_schema = %s
                    ORDER BY table_name, ordinal_position;
                    """,
                    (payload.schema_name,),
                )
                source_columns = src_cur.fetchall()

                src_cur.execute(
                    """
                    SELECT tc.table_name, kcu.column_name
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = %s;
                    """,
                    (payload.schema_name,),
                )
                pk_rows = src_cur.fetchall()

                src_cur.execute(
                    """
                    SELECT tc.constraint_name,
                           kcu.table_name AS from_table,
                           kcu.column_name AS from_column,
                           ccu.table_name AS to_table,
                           ccu.column_name AS to_column,
                           rc.update_rule,
                           rc.delete_rule
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage ccu
                      ON tc.constraint_name = ccu.constraint_name
                     AND tc.table_schema = ccu.table_schema
                    JOIN information_schema.referential_constraints rc
                      ON tc.constraint_name = rc.constraint_name
                     AND tc.table_schema = rc.constraint_schema
                    WHERE tc.constraint_type = 'FOREIGN KEY'
                      AND tc.table_schema = %s
                    ORDER BY tc.constraint_name;
                    """,
                    (payload.schema_name,),
                )
                fk_rows = src_cur.fetchall()

        primary_keys: dict[tuple[str, str], set[str]] = defaultdict(set)
        for row in pk_rows:
            primary_keys[(row["table_name"], row["column_name"])].add(row["column_name"])

        with conn.cursor() as cur:
            cur.execute(sql.CLEAR_RELATIONSHIPS, {"diagram_id": diagram_id})
            cur.execute(sql.CLEAR_COLUMNS, {"diagram_id": diagram_id})
            cur.execute(sql.CLEAR_TABLES, {"diagram_id": diagram_id})

            table_id_map: dict[str, str] = {}
            for idx, table in enumerate(source_tables):
                cur.execute(
                    sql.INSERT_TABLE,
                    {
                        "diagram_id": diagram_id,
                        "schema_name": table["table_schema"],
                        "table_name": table["table_name"],
                        "display_name": table["table_name"],
                        "pos_x": 120 + (idx % 4) * 340,
                        "pos_y": 120 + (idx // 4) * 260,
                    },
                )
                table_id_map[table["table_name"]] = str(cur.fetchone()["table_id"])

            column_id_map: dict[tuple[str, str], str] = {}
            for col in source_columns:
                table_id = table_id_map.get(col["table_name"])
                if not table_id:
                    continue
                cur.execute(
                    sql.INSERT_COLUMN,
                    {
                        "table_id": table_id,
                        "column_name": col["column_name"],
                        "ordinal_position": col["ordinal_position"],
                        "data_type": col["data_type"],
                        "udt_name": col["udt_name"],
                        "is_nullable": col["is_nullable"] == "YES",
                        "default_sql": col["column_default"],
                        "is_primary_key": (col["table_name"], col["column_name"]) in primary_keys,
                        "is_unique": False,
                    },
                )
                column_id_map[(col["table_name"], col["column_name"])] = str(cur.fetchone()["column_id"])

            relationship_count = 0
            for fk in fk_rows:
                from_table_id = table_id_map.get(fk["from_table"])
                to_table_id = table_id_map.get(fk["to_table"])
                from_column_id = column_id_map.get((fk["from_table"], fk["from_column"]))
                to_column_id = column_id_map.get((fk["to_table"], fk["to_column"]))
                if not from_table_id or not to_table_id or not from_column_id or not to_column_id:
                    continue

                cur.execute(
                    sql.INSERT_RELATIONSHIP,
                    {
                        "diagram_id": diagram_id,
                        "name": fk["constraint_name"],
                        "from_table_id": from_table_id,
                        "from_column_id": from_column_id,
                        "to_table_id": to_table_id,
                        "to_column_id": to_column_id,
                        "on_update_action": fk["update_rule"],
                        "on_delete_action": fk["delete_rule"],
                    },
                )
                relationship_count += 1

        return {
            "table_count": len(table_id_map),
            "column_count": len(column_id_map),
            "relationship_count": relationship_count,
        }
