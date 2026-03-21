from __future__ import annotations

from collections.abc import Callable
import re

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import NotFoundError, ValidationError
from app.features.introspection.parser import (
    SchemaImportColumn,
    SchemaImportData,
    SchemaImportForeignKey,
    SchemaImportTable,
    parse_postgres_ddl,
)
from app.features.introspection import sql
from app.features.introspection.schemas import (
    ImportPostgresRequest,
    ImportSqlRawRequest,
    PostgresConnectionRequest,
)


class IntrospectionService:
    _FATAL_RE = re.compile(r"FATAL:\s*(.+)", re.IGNORECASE)

    def __init__(self, db: Database) -> None:
        self.db = db

    def test_postgres_connection(
        self,
        diagram_id: str,
        payload: PostgresConnectionRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            self._ensure_diagram_exists(conn, diagram_id)

        with self._connect_source(payload) as source_conn:
            with source_conn.cursor() as src_cur:
                src_cur.execute(
                    """
                    SELECT
                      current_database() AS database_name,
                      current_user AS current_user,
                      version() AS server_version;
                    """
                )
                row = src_cur.fetchone()

        return {
            "status": "ok",
            "database_name": row["database_name"],
            "current_user": row["current_user"],
            "server_version": row["server_version"],
        }

    def list_postgres_schemas(
        self,
        diagram_id: str,
        payload: PostgresConnectionRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            self._ensure_diagram_exists(conn, diagram_id)

        with self._connect_source(payload) as source_conn:
            with source_conn.cursor() as src_cur:
                schemas = self._fetch_available_schemas(src_cur)

        default_schema = "public" if "public" in schemas else (schemas[0] if schemas else "public")

        return {
            "status": "ok",
            "schemas": schemas,
            "default_schema": default_schema,
        }

    def import_postgres(
        self,
        diagram_id: str,
        payload: ImportPostgresRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            diagram = self._ensure_diagram_exists(conn, diagram_id)
            with conn.cursor() as cur:
                connection_name = payload.connection_name or f"{payload.host}:{payload.port}/{payload.database_name}"
                connection_id = self._upsert_db_connection(
                    cur=cur,
                    workspace_id=diagram["workspace_id"],
                    name=connection_name,
                    host=payload.host,
                    port=payload.port,
                    database_name=payload.database_name,
                    username=payload.username,
                    ssl_mode=payload.ssl_mode,
                )

            import_job_id, summary = self._run_import_job(
                conn=conn,
                diagram_id=diagram_id,
                connection_id=connection_id,
                schema_loader=lambda: self._collect_schema_data_from_postgres(payload),
            )

        return {
            "import_job_id": import_job_id,
            "connection_id": connection_id,
            "status": "success",
            **summary,
        }

    def import_sql_raw(
        self,
        diagram_id: str,
        payload: ImportSqlRawRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            diagram = self._ensure_diagram_exists(conn, diagram_id)

            with conn.cursor() as cur:
                connection_id = self._upsert_db_connection(
                    cur=cur,
                    workspace_id=diagram["workspace_id"],
                    name="SQL Paste Import",
                    host="local-sql",
                    port=5432,
                    database_name="sql_import",
                    username="local",
                    ssl_mode="disable",
                )

            import_job_id, summary = self._run_import_job(
                conn=conn,
                diagram_id=diagram_id,
                connection_id=connection_id,
                schema_loader=lambda: self._collect_schema_data_from_sql(payload.sql),
            )

        return {
            "import_job_id": import_job_id,
            "connection_id": connection_id,
            "status": "success",
            **summary,
        }

    def import_sql_file(
        self,
        diagram_id: str,
        file_content: bytes,
        filename: str | None,
        ctx: RequestContext,
    ) -> dict:
        sql_text = self._decode_sql_file(file_content)
        connection_name = f"SQL File Import: {filename}" if filename else "SQL File Import"

        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            diagram = self._ensure_diagram_exists(conn, diagram_id)

            with conn.cursor() as cur:
                connection_id = self._upsert_db_connection(
                    cur=cur,
                    workspace_id=diagram["workspace_id"],
                    name=connection_name,
                    host="local-file",
                    port=5432,
                    database_name="sql_import",
                    username="local",
                    ssl_mode="disable",
                )

            import_job_id, summary = self._run_import_job(
                conn=conn,
                diagram_id=diagram_id,
                connection_id=connection_id,
                schema_loader=lambda: self._collect_schema_data_from_sql(sql_text),
            )

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
        schema_data: SchemaImportData,
    ) -> dict:
        schema_names = schema_data.schema_names
        if not schema_names:
            schema_names = sorted(
                {(table.schema_name or "public") for table in schema_data.tables},
                key=lambda item: (item != "public", item),
            )

        with conn.cursor() as cur:
            cur.execute(sql.CLEAR_RELATIONSHIPS, {"diagram_id": diagram_id})
            cur.execute(sql.CLEAR_COLUMNS, {"diagram_id": diagram_id})
            cur.execute(sql.CLEAR_TABLES, {"diagram_id": diagram_id})

            table_id_map: dict[tuple[str, str], str] = {}
            for idx, table in enumerate(schema_data.tables):
                cur.execute(
                    sql.INSERT_TABLE,
                    {
                        "diagram_id": diagram_id,
                        "schema_name": table.schema_name,
                        "table_name": table.table_name,
                        "display_name": table.display_name,
                        "pos_x": 120 + (idx % 4) * 340,
                        "pos_y": 120 + (idx // 4) * 260,
                    },
                )
                table_id_map[(table.schema_name, table.table_name)] = str(cur.fetchone()["table_id"])

            column_id_map: dict[tuple[str, str, str], str] = {}
            for col in schema_data.columns:
                table_id = table_id_map.get((col.schema_name, col.table_name))
                if not table_id:
                    continue
                key = (col.schema_name, col.table_name, col.column_name)
                cur.execute(
                    sql.INSERT_COLUMN,
                    {
                        "table_id": table_id,
                        "column_name": col.column_name,
                        "ordinal_position": col.ordinal_position,
                        "data_type": col.data_type,
                        "udt_name": col.udt_name,
                        "is_nullable": col.is_nullable,
                        "default_sql": col.column_default,
                        "is_primary_key": col.is_primary_key,
                        "is_unique": col.is_unique,
                    },
                )
                column_id_map[key] = str(cur.fetchone()["column_id"])

            relationship_count = 0
            for fk in schema_data.foreign_keys:
                from_table_id = table_id_map.get((fk.from_schema, fk.from_table))
                to_table_id = table_id_map.get((fk.to_schema, fk.to_table))
                from_column_id = column_id_map.get(
                    (fk.from_schema, fk.from_table, fk.from_column)
                )
                to_column_id = column_id_map.get((fk.to_schema, fk.to_table, fk.to_column))
                if not from_table_id or not to_table_id or not from_column_id or not to_column_id:
                    continue

                cur.execute(
                    sql.INSERT_RELATIONSHIP,
                    {
                        "diagram_id": diagram_id,
                        "name": fk.name,
                        "from_table_id": from_table_id,
                        "from_column_id": from_column_id,
                        "to_table_id": to_table_id,
                        "to_column_id": to_column_id,
                        "on_update_action": fk.on_update_action,
                        "on_delete_action": fk.on_delete_action,
                    },
                )
                relationship_count += 1

        return {
            "table_count": len(table_id_map),
            "column_count": len(column_id_map),
            "relationship_count": relationship_count,
            "schema_count": len(schema_names),
            "imported_schemas": schema_names,
        }

    def _run_import_job(
        self,
        *,
        conn: psycopg.Connection,
        diagram_id: str,
        connection_id: str,
        schema_loader: Callable[[], SchemaImportData],
    ) -> tuple[str, dict]:
        with conn.cursor() as cur:
            cur.execute(
                sql.CREATE_IMPORT_JOB,
                {
                    "diagram_id": diagram_id,
                    "connection_id": connection_id,
                },
            )
            import_job_id = cur.fetchone()["import_job_id"]

        try:
            schema_data = schema_loader()
            summary = self._sync_schema(conn, diagram_id, schema_data)
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

        return import_job_id, summary

    def _upsert_db_connection(
        self,
        *,
        cur,
        workspace_id: str,
        name: str,
        host: str,
        port: int,
        database_name: str,
        username: str,
        ssl_mode: str,
    ) -> str:
        cur.execute(
            sql.UPSERT_DB_CONNECTION,
            {
                "workspace_id": workspace_id,
                "name": name,
                "host": host,
                "port": port,
                "database_name": database_name,
                "username": username,
                "password_secret_ref": f"local://{name}",
                "ssl_mode": ssl_mode,
            },
        )
        return str(cur.fetchone()["connection_id"])

    def _collect_schema_data_from_sql(self, sql_text: str) -> SchemaImportData:
        try:
            return parse_postgres_ddl(sql_text)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc

    def _collect_schema_data_from_postgres(
        self,
        payload: ImportPostgresRequest,
    ) -> SchemaImportData:
        try:
            with self._connect_source(payload) as source_conn:
                with source_conn.cursor() as src_cur:
                    available_schemas = self._fetch_available_schemas(src_cur)
                    schema_names = self._resolve_schema_names(payload, available_schemas)

                    if not schema_names:
                        raise ValidationError("No schemas selected for import.")

                    src_cur.execute(
                        """
                        SELECT table_schema, table_name
                        FROM information_schema.tables
                        WHERE table_type = 'BASE TABLE'
                          AND table_schema = ANY(%s)
                        ORDER BY table_schema, table_name;
                        """,
                        (schema_names,),
                    )
                    source_tables = src_cur.fetchall()

                    src_cur.execute(
                        """
                        SELECT table_schema, table_name, column_name, ordinal_position, data_type,
                               udt_name, is_nullable, column_default
                        FROM information_schema.columns
                        WHERE table_schema = ANY(%s)
                        ORDER BY table_schema, table_name, ordinal_position;
                        """,
                        (schema_names,),
                    )
                    source_columns = src_cur.fetchall()

                    src_cur.execute(
                        """
                        SELECT tc.table_schema, tc.table_name, kcu.column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                          ON tc.constraint_name = kcu.constraint_name
                         AND tc.table_schema = kcu.table_schema
                        WHERE tc.constraint_type = 'PRIMARY KEY'
                          AND tc.table_schema = ANY(%s);
                        """,
                        (schema_names,),
                    )
                    pk_rows = src_cur.fetchall()

                    src_cur.execute(
                        """
                        SELECT tc.table_schema, tc.table_name, kcu.column_name
                        FROM information_schema.table_constraints tc
                        JOIN information_schema.key_column_usage kcu
                          ON tc.constraint_name = kcu.constraint_name
                         AND tc.table_schema = kcu.table_schema
                        WHERE tc.constraint_type = 'UNIQUE'
                          AND tc.table_schema = ANY(%s);
                        """,
                        (schema_names,),
                    )
                    unique_rows = src_cur.fetchall()

                    src_cur.execute(
                        """
                        SELECT tc.constraint_name,
                               kcu.table_schema AS from_schema,
                               kcu.table_name AS from_table,
                               kcu.column_name AS from_column,
                               ccu.table_schema AS to_schema,
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
                          AND kcu.table_schema = ANY(%s)
                          AND ccu.table_schema = ANY(%s)
                        ORDER BY tc.constraint_name;
                        """,
                        (schema_names, schema_names),
                    )
                    fk_rows = src_cur.fetchall()
        except ValidationError:
            raise
        except psycopg.Error as exc:
            raise ValidationError(self._friendly_source_error(exc)) from exc

        primary_keys: set[tuple[str, str, str]] = {
            (row["table_schema"], row["table_name"], row["column_name"]) for row in pk_rows
        }
        unique_keys: set[tuple[str, str, str]] = {
            (row["table_schema"], row["table_name"], row["column_name"]) for row in unique_rows
        }

        tables = [
            SchemaImportTable(
                schema_name=table["table_schema"],
                table_name=table["table_name"],
                display_name=table["table_name"],
            )
            for table in source_tables
        ]
        columns = [
            SchemaImportColumn(
                schema_name=column["table_schema"],
                table_name=column["table_name"],
                column_name=column["column_name"],
                ordinal_position=column["ordinal_position"],
                data_type=column["data_type"],
                udt_name=column["udt_name"],
                is_nullable=column["is_nullable"] == "YES",
                column_default=column["column_default"],
                is_primary_key=(
                    column["table_schema"],
                    column["table_name"],
                    column["column_name"],
                )
                in primary_keys,
                is_unique=(
                    (column["table_schema"], column["table_name"], column["column_name"])
                    in unique_keys
                    or (
                        column["table_schema"],
                        column["table_name"],
                        column["column_name"],
                    )
                    in primary_keys
                ),
            )
            for column in source_columns
        ]
        foreign_keys = [
            SchemaImportForeignKey(
                name=row["constraint_name"],
                from_schema=row["from_schema"],
                from_table=row["from_table"],
                from_column=row["from_column"],
                to_schema=row["to_schema"],
                to_table=row["to_table"],
                to_column=row["to_column"],
                on_update_action=row["update_rule"],
                on_delete_action=row["delete_rule"],
            )
            for row in fk_rows
        ]

        return SchemaImportData(
            schema_names=schema_names,
            tables=tables,
            columns=columns,
            foreign_keys=foreign_keys,
        )

    @staticmethod
    def _decode_sql_file(file_content: bytes) -> str:
        if not file_content:
            raise ValidationError("Uploaded SQL file is empty.")

        for encoding in ("utf-8-sig", "utf-8", "latin-1"):
            try:
                decoded = file_content.decode(encoding)
            except UnicodeDecodeError:
                continue
            if decoded.strip():
                return decoded

        raise ValidationError("Unable to decode SQL file. Use UTF-8 encoded text.")

    def _ensure_diagram_exists(self, conn, diagram_id: str) -> dict:
        with conn.cursor() as cur:
            cur.execute(sql.GET_DIAGRAM_WORKSPACE, {"diagram_id": diagram_id})
            diagram = cur.fetchone()
        if not diagram:
            raise NotFoundError("diagram not found")
        return diagram

    @staticmethod
    def _build_source_dsn(payload: PostgresConnectionRequest) -> str:
        return (
            f"host={payload.host} port={payload.port} dbname={payload.database_name} "
            f"user={payload.username} password={payload.password} sslmode={payload.ssl_mode} connect_timeout=8"
        )

    def _connect_source(self, payload: PostgresConnectionRequest) -> psycopg.Connection:
        try:
            return psycopg.connect(self._build_source_dsn(payload), row_factory=dict_row)
        except psycopg.Error as exc:
            raise ValidationError(self._friendly_source_error(exc)) from exc

    def _friendly_source_error(self, exc: Exception) -> str:
        raw = str(exc).strip()
        if not raw:
            return "Unable to connect to PostgreSQL source."

        fatal_match = self._FATAL_RE.search(raw)
        if fatal_match:
            return f"PostgreSQL authentication failed: {fatal_match.group(1)}"

        first_line = raw.splitlines()[0].strip()
        return f"PostgreSQL connection failed: {first_line}"

    @staticmethod
    def _fetch_available_schemas(src_cur) -> list[str]:
        src_cur.execute(
            """
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name <> 'information_schema'
              AND schema_name NOT LIKE 'pg_%'
            ORDER BY CASE WHEN schema_name = 'public' THEN 0 ELSE 1 END, schema_name;
            """
        )
        rows = src_cur.fetchall()
        return [row["schema_name"] for row in rows]

    def _resolve_schema_names(
        self,
        payload: ImportPostgresRequest,
        available_schemas: list[str],
    ) -> list[str]:
        available_set = set(available_schemas)
        if payload.import_all_schemas:
            return available_schemas

        selected: list[str]
        if payload.schema_names:
            selected = sorted({schema.strip() for schema in payload.schema_names if schema.strip()})
        elif payload.schema_name and payload.schema_name.strip():
            selected = [payload.schema_name.strip()]
        else:
            selected = ["public"] if "public" in available_set else available_schemas[:1]

        unknown = [schema for schema in selected if schema not in available_set]
        if unknown:
            raise ValidationError(f"Unknown schema selection: {', '.join(sorted(unknown))}")

        return selected
