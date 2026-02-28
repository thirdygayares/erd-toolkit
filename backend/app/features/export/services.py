from __future__ import annotations

from collections import defaultdict

from psycopg.types.json import Jsonb

from app.core.context import RequestContext
from app.core.db import Database
from app.features.export import sql
from app.features.export.schemas import ExportSqlRequest


class ExportService:
    def __init__(self, db: Database) -> None:
        self.db = db

    def export_sql(self, diagram_id: str, payload: ExportSqlRequest, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.CREATE_EXPORT_JOB, {"diagram_id": diagram_id})
                export_job_id = cur.fetchone()["export_job_id"]

            try:
                sql_output, statement_count = self._generate_sql(conn, diagram_id, payload.target_schema)
                with conn.cursor() as cur:
                    cur.execute(
                        sql.MARK_EXPORT_SUCCESS,
                        {
                            "export_job_id": export_job_id,
                            "sql_output": sql_output,
                            "diff_summary": Jsonb({"statement_count": statement_count}),
                        },
                    )
                return {
                    "export_job_id": export_job_id,
                    "status": "success",
                    "statement_count": statement_count,
                    "sql_output": sql_output,
                }
            except Exception as exc:
                with conn.cursor() as cur:
                    cur.execute(
                        sql.MARK_EXPORT_FAILED,
                        {
                            "export_job_id": export_job_id,
                            "error_text": str(exc),
                        },
                    )
                raise

    def _generate_sql(self, conn, diagram_id: str, target_schema: str) -> tuple[str, int]:
        with conn.cursor() as cur:
            cur.execute(sql.GET_TABLES, {"diagram_id": diagram_id})
            tables = cur.fetchall()

            relationships: list[dict]
            cur.execute(sql.GET_RELATIONSHIPS, {"diagram_id": diagram_id})
            relationships = cur.fetchall()

            columns_by_table: dict[str, list[dict]] = defaultdict(list)
            column_lookup: dict[str, str] = {}
            table_lookup: dict[str, str] = {}

            for table in tables:
                table_lookup[str(table["table_id"])] = table["table_name"]
                cur.execute(sql.GET_COLUMNS, {"table_id": table["table_id"]})
                cols = cur.fetchall()
                columns_by_table[str(table["table_id"])] = cols
                for col in cols:
                    column_lookup[str(col["column_id"])] = col["column_name"]

        statements: list[str] = []

        for table in tables:
            cols = columns_by_table.get(str(table["table_id"]), [])
            column_defs: list[str] = []
            pk_columns: list[str] = []
            for col in cols:
                type_sql = col["udt_name"] if col["data_type"] == "USER-DEFINED" and col["udt_name"] else col["data_type"]
                pieces = [f"{self._q(col['column_name'])} {type_sql}"]
                if col["default_sql"]:
                    pieces.append(f"DEFAULT {col['default_sql']}")
                if not col["is_nullable"]:
                    pieces.append("NOT NULL")
                column_defs.append(" ".join(pieces))
                if col["is_primary_key"]:
                    pk_columns.append(self._q(col["column_name"]))

            if pk_columns:
                column_defs.append(f"PRIMARY KEY ({', '.join(pk_columns)})")

            create_table_sql = (
                f"CREATE TABLE IF NOT EXISTS {self._q(target_schema)}.{self._q(table['table_name'])} (\n"
                + "  "
                + ",\n  ".join(column_defs)
                + "\n);"
            )
            statements.append(create_table_sql)

        for rel in relationships:
            from_table = table_lookup.get(str(rel["from_table_id"]))
            to_table = table_lookup.get(str(rel["to_table_id"]))
            from_column = column_lookup.get(str(rel["from_column_id"]))
            to_column = column_lookup.get(str(rel["to_column_id"]))
            if not from_table or not to_table or not from_column or not to_column:
                continue

            statements.append(
                (
                    f"ALTER TABLE {self._q(target_schema)}.{self._q(from_table)} "
                    f"ADD CONSTRAINT {self._q(rel['name'])} "
                    f"FOREIGN KEY ({self._q(from_column)}) "
                    f"REFERENCES {self._q(target_schema)}.{self._q(to_table)} ({self._q(to_column)}) "
                    f"ON UPDATE {rel['on_update_action']} ON DELETE {rel['on_delete_action']};"
                )
            )

        final_sql = "\n\n".join(statements) + ("\n" if statements else "")
        return final_sql, len(statements)

    @staticmethod
    def _q(identifier: str) -> str:
        return '"' + identifier.replace('"', '""') + '"'
