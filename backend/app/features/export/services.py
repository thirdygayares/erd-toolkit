from __future__ import annotations

from collections import defaultdict
import re

from psycopg.types.json import Jsonb

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import ValidationError
from app.features.export import sql
from app.features.export.schemas import ExportSqlRequest


class ExportService:
    _IDENTITY_DEFAULT_RE = re.compile(
        r"^generated\s+(always|by\s+default)\s+as\s+identity(?:\s*\(.*\))?$",
        re.IGNORECASE,
    )
    _IDENTITY_COMPATIBLE_TYPES = {"smallint", "int2", "integer", "int", "int4", "bigint", "int8"}
    _SAFE_IDENTIFIER_RE = re.compile(r"^[a-z_][a-z0-9_]*$")
    _RESERVED_WORDS = {
        "all",
        "alter",
        "and",
        "any",
        "as",
        "asc",
        "between",
        "by",
        "case",
        "check",
        "constraint",
        "create",
        "default",
        "delete",
        "desc",
        "distinct",
        "drop",
        "exists",
        "false",
        "foreign",
        "from",
        "group",
        "having",
        "in",
        "index",
        "insert",
        "into",
        "is",
        "join",
        "key",
        "limit",
        "not",
        "null",
        "on",
        "or",
        "order",
        "primary",
        "references",
        "select",
        "set",
        "table",
        "true",
        "union",
        "unique",
        "update",
        "user",
        "using",
        "values",
        "where",
    }

    def __init__(self, db: Database) -> None:
        self.db = db

    def export_sql(self, diagram_id: str, payload: ExportSqlRequest, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.CREATE_EXPORT_JOB, {"diagram_id": diagram_id})
                export_job_id = cur.fetchone()["export_job_id"]

            try:
                sql_output, statement_count = self._generate_sql(
                    conn,
                    diagram_id,
                    payload.target_schema,
                    payload.source_schema_names,
                    payload.export_all_schemas,
                )
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

    def _generate_sql(
        self,
        conn,
        diagram_id: str,
        target_schema: str,
        source_schema_names: list[str] | None = None,
        export_all_schemas: bool = True,
    ) -> tuple[str, int]:
        with conn.cursor() as cur:
            cur.execute(sql.GET_TABLES, {"diagram_id": diagram_id})
            tables = cur.fetchall()

            selected_schema_names = self._resolve_source_schema_names(
                tables,
                source_schema_names=source_schema_names or [],
                export_all_schemas=export_all_schemas,
            )
            tables = [
                table for table in tables if table["schema_name"] in selected_schema_names
            ]

            relationships: list[dict]
            cur.execute(sql.GET_RELATIONSHIPS, {"diagram_id": diagram_id})
            relationships = cur.fetchall()
            selected_table_ids = {str(table["table_id"]) for table in tables}
            relationships = [
                rel
                for rel in relationships
                if str(rel["from_table_id"]) in selected_table_ids
                and str(rel["to_table_id"]) in selected_table_ids
            ]

            columns_by_table: dict[str, list[dict]] = defaultdict(list)
            column_lookup: dict[str, str] = {}
            column_meta_lookup: dict[str, dict] = {}
            export_table_lookup = self._build_export_table_lookup(tables)

            for table in tables:
                cur.execute(sql.GET_COLUMNS, {"table_id": table["table_id"]})
                cols = cur.fetchall()
                columns_by_table[str(table["table_id"])] = cols
                for col in cols:
                    column_id = str(col["column_id"])
                    rendered_type = self._render_type_sql(col)
                    column_lookup[column_id] = col["column_name"]
                    column_meta_lookup[column_id] = {
                        "type_sql": rendered_type,
                        "is_primary_key": bool(col.get("is_primary_key")),
                        "is_unique": bool(col.get("is_unique")),
                    }

        statements: list[str] = []
        warnings: list[str] = []

        for table in tables:
            export_table_name = export_table_lookup.get(str(table["table_id"]), table["table_name"])
            cols = columns_by_table.get(str(table["table_id"]), [])
            column_defs: list[str] = []
            pk_columns: list[str] = []
            for col in cols:
                type_sql = self._render_type_sql(col)
                pieces = [f"{self._q(col['column_name'])} {type_sql}"]
                default_clause, warning = self._render_default_clause(
                    default_sql=col["default_sql"],
                    type_sql=type_sql,
                    table_name=export_table_name,
                    column_name=col["column_name"],
                )
                if default_clause:
                    pieces.append(default_clause)
                if warning:
                    warnings.append(warning)
                if not col["is_nullable"]:
                    pieces.append("NOT NULL")
                column_defs.append(" ".join(pieces))
                if col["is_primary_key"]:
                    pk_columns.append(self._q(col["column_name"]))
                if col.get("is_unique") and not col.get("is_primary_key"):
                    column_defs.append(f"UNIQUE ({self._q(col['column_name'])})")

            if pk_columns:
                column_defs.append(f"PRIMARY KEY ({', '.join(pk_columns)})")

            if column_defs:
                create_table_sql = (
                    f"CREATE TABLE IF NOT EXISTS {self._q(target_schema)}.{self._q(export_table_name)} (\n"
                    + "  "
                    + ",\n  ".join(column_defs)
                    + "\n);"
                )
            else:
                create_table_sql = (
                    f"CREATE TABLE IF NOT EXISTS {self._q(target_schema)}.{self._q(export_table_name)} ();"
                )
            statements.append(create_table_sql)

        for rel in relationships:
            from_table = export_table_lookup.get(str(rel["from_table_id"]))
            to_table = export_table_lookup.get(str(rel["to_table_id"]))
            from_column = column_lookup.get(str(rel["from_column_id"]))
            to_column = column_lookup.get(str(rel["to_column_id"]))
            if not from_table or not to_table or not from_column or not to_column:
                continue
            from_meta = column_meta_lookup.get(str(rel["from_column_id"]))
            to_meta = column_meta_lookup.get(str(rel["to_column_id"]))
            if not from_meta or not to_meta:
                continue

            if not (to_meta["is_primary_key"] or to_meta["is_unique"]):
                warnings.append(
                    "-- WARNING: skipped foreign key "
                    f"{self._q(rel['name'])} because referenced column "
                    f"{self._q(to_table)}.{self._q(to_column)} is not PRIMARY KEY or UNIQUE."
                )
                continue

            if not self._types_are_fk_compatible(from_meta["type_sql"], to_meta["type_sql"]):
                warnings.append(
                    "-- WARNING: skipped foreign key "
                    f"{self._q(rel['name'])} due to incompatible types "
                    f"{from_meta['type_sql']} -> {to_meta['type_sql']}."
                )
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

        output_parts: list[str] = []
        if warnings:
            output_parts.append("\n".join(warnings))
        if statements:
            output_parts.append("\n\n".join(statements))

        final_sql = "\n\n".join(output_parts) + ("\n" if output_parts else "")
        return final_sql, len(statements)

    @staticmethod
    def _q(identifier: str) -> str:
        if (
            ExportService._SAFE_IDENTIFIER_RE.match(identifier)
            and identifier not in ExportService._RESERVED_WORDS
        ):
            return identifier
        return '"' + identifier.replace('"', '""') + '"'

    @staticmethod
    def _normalize_export_identifier(value: str | None) -> str | None:
        if not value:
            return None
        normalized = re.sub(r"[^a-z0-9_]+", "_", value.strip().lower()).strip("_")
        if not normalized or len(normalized) > 63:
            return None
        return normalized

    def _build_export_table_lookup(self, tables: list[dict]) -> dict[str, str]:
        preferred_names: dict[str, str] = {}
        name_usage: dict[str, int] = defaultdict(int)

        for table in tables:
            table_id = str(table["table_id"])
            candidate = self._normalize_export_identifier(table.get("display_name"))
            if candidate:
                preferred_names[table_id] = candidate
                name_usage[candidate] += 1

        export_names: dict[str, str] = {}
        for table in tables:
            table_id = str(table["table_id"])
            preferred = preferred_names.get(table_id)
            if preferred and name_usage.get(preferred, 0) == 1:
                export_names[table_id] = preferred
            else:
                export_names[table_id] = table["table_name"]

        return export_names

    @staticmethod
    def _render_type_sql(col: dict) -> str:
        type_sql = (
            col["udt_name"]
            if col["data_type"] == "USER-DEFINED" and col["udt_name"]
            else col["data_type"]
        )
        normalized = str(type_sql).strip()
        lower = normalized.lower()
        if lower == "varchar(n)":
            return "varchar"
        if normalized.endswith("?"):
            return normalized[:-1].strip()
        return normalized

    @classmethod
    def _is_identity_default(cls, default_sql: str) -> bool:
        return bool(cls._IDENTITY_DEFAULT_RE.match(default_sql.strip()))

    @classmethod
    def _is_identity_compatible_type(cls, type_sql: str) -> bool:
        canonical = cls._canonical_type(type_sql)
        if canonical.endswith("[]"):
            return False
        return canonical in cls._IDENTITY_COMPATIBLE_TYPES

    def _render_default_clause(
        self,
        *,
        default_sql: str | None,
        type_sql: str,
        table_name: str,
        column_name: str,
    ) -> tuple[str | None, str | None]:
        if not default_sql:
            return None, None

        normalized_default = " ".join(default_sql.strip().split())
        if not normalized_default:
            return None, None

        if self._is_identity_default(normalized_default):
            if self._is_identity_compatible_type(type_sql):
                if normalized_default.lower().startswith("generated always"):
                    return "GENERATED ALWAYS AS IDENTITY", None
                return "GENERATED BY DEFAULT AS IDENTITY", None

            warning = (
                f"-- WARNING: dropped identity clause for "
                f"{self._q(table_name)}.{self._q(column_name)} "
                f"because type {type_sql} is not integer-compatible."
            )
            return None, warning

        return f"DEFAULT {default_sql.strip()}", None

    @staticmethod
    def _canonical_type(type_sql: str) -> str:
        normalized = type_sql.strip().lower()
        if normalized.endswith("[]"):
            base = re.sub(r"\(.*\)", "", normalized[:-2]).strip()
            return f"{base}[]"
        base = re.sub(r"\(.*\)", "", normalized).strip()
        aliases = {
            "int": "integer",
            "int4": "integer",
            "integer": "integer",
            "bigint": "bigint",
            "int8": "bigint",
            "smallint": "smallint",
            "int2": "smallint",
            "bool": "boolean",
            "character varying": "varchar",
            "varchar": "varchar",
            "timestamp with time zone": "timestamptz",
            "timestamp without time zone": "timestamp",
        }
        return aliases.get(base, base)

    @classmethod
    def _types_are_fk_compatible(cls, from_type: str, to_type: str) -> bool:
        left = cls._canonical_type(from_type)
        right = cls._canonical_type(to_type)
        if left == right:
            return True
        return {left, right} == {"text", "varchar"}

    def _resolve_source_schema_names(
        self,
        tables: list[dict],
        *,
        source_schema_names: list[str],
        export_all_schemas: bool,
    ) -> set[str]:
        available = {table["schema_name"] for table in tables}
        if export_all_schemas:
            return available

        selected = {schema.strip() for schema in source_schema_names if schema and schema.strip()}
        if not selected:
            raise ValidationError(
                "No source schemas selected for export. Choose at least one schema or enable export-all."
            )

        unknown = sorted(selected - available)
        if unknown:
            raise ValidationError(
                f"Unknown source schema selection: {', '.join(unknown)}"
            )
        return selected
