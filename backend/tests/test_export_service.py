from __future__ import annotations

from uuid import uuid4

from app.features.export.services import ExportService


class _FakeCursor:
    def __init__(self, tables: list[dict], relationships: list[dict], columns_by_table: dict[str, list[dict]]):
        self._tables = tables
        self._relationships = relationships
        self._columns_by_table = columns_by_table
        self._last_query = ""
        self._last_params: dict = {}

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query: str, params: dict | None = None):
        self._last_query = query
        self._last_params = params or {}

    def fetchall(self):
        if "fn_export_get_tables_v2" in self._last_query:
            return self._tables
        if "fn_export_get_relationships" in self._last_query:
            return self._relationships
        if "fn_export_get_columns" in self._last_query:
            table_id = str(self._last_params["table_id"])
            return self._columns_by_table.get(table_id, [])
        return []


class _FakeConnection:
    def __init__(self, tables: list[dict], relationships: list[dict], columns_by_table: dict[str, list[dict]]):
        self._tables = tables
        self._relationships = relationships
        self._columns_by_table = columns_by_table

    def cursor(self):
        return _FakeCursor(self._tables, self._relationships, self._columns_by_table)


def test_generate_sql_prefers_unique_display_name_and_normalizes_varchar_n():
    table_1 = str(uuid4())
    table_2 = str(uuid4())
    col_1 = str(uuid4())
    col_1_label = str(uuid4())
    col_2 = str(uuid4())

    tables = [
        {
            "table_id": table_1,
            "schema_name": "public",
            "table_name": "table_4",
            "display_name": "Employees",
        },
        {
            "table_id": table_2,
            "schema_name": "public",
            "table_name": "table_2",
            "display_name": "table_2",
        },
    ]
    columns_by_table = {
        table_1: [
            {
                "column_id": col_1,
                "table_id": table_1,
                "column_name": "id",
                "data_type": "uuid",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            },
            {
                "column_id": col_1_label,
                "table_id": table_1,
                "column_name": "name",
                "data_type": "varchar(n)",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": False,
                "is_unique": False,
            }
        ],
        table_2: [
            {
                "column_id": col_2,
                "table_id": table_2,
                "column_name": "id",
                "data_type": "uuid",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ],
    }
    relationships = [
        {
            "relationship_id": str(uuid4()),
            "name": "fk_employees_table_2",
            "from_table_id": table_1,
            "from_column_id": col_1,
            "to_table_id": table_2,
            "to_column_id": col_2,
            "on_update_action": "NO ACTION",
            "on_delete_action": "CASCADE",
        }
    ]

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, relationships, columns_by_table)

    sql_output, statement_count = service._generate_sql(conn, str(uuid4()), "public")

    assert statement_count == 3
    assert "CREATE TABLE IF NOT EXISTS public.employees" in sql_output
    assert "CREATE TABLE IF NOT EXISTS public.table_4" not in sql_output
    assert "name varchar NOT NULL" in sql_output
    assert "varchar(n)" not in sql_output
    assert "REFERENCES public.table_2 (id)" in sql_output


def test_generate_sql_falls_back_to_table_name_when_display_name_collides():
    table_1 = str(uuid4())
    table_2 = str(uuid4())
    col_1 = str(uuid4())
    col_2 = str(uuid4())

    tables = [
        {
            "table_id": table_1,
            "schema_name": "public",
            "table_name": "users_a",
            "display_name": "Users",
        },
        {
            "table_id": table_2,
            "schema_name": "public",
            "table_name": "users_b",
            "display_name": "users",
        },
    ]
    columns_by_table = {
        table_1: [
            {
                "column_id": col_1,
                "table_id": table_1,
                "column_name": "id",
                "data_type": "uuid",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ],
        table_2: [
            {
                "column_id": col_2,
                "table_id": table_2,
                "column_name": "id",
                "data_type": "uuid",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ],
    }

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, [], columns_by_table)

    sql_output, statement_count = service._generate_sql(conn, str(uuid4()), "public")

    assert statement_count == 2
    assert "CREATE TABLE IF NOT EXISTS public.users_a" in sql_output
    assert "CREATE TABLE IF NOT EXISTS public.users_b" in sql_output
    assert "CREATE TABLE IF NOT EXISTS public.users" not in sql_output


def test_generate_sql_keeps_identity_clause_without_default_for_integer_types():
    table_1 = str(uuid4())
    col_1 = str(uuid4())

    tables = [
        {
            "table_id": table_1,
            "schema_name": "public",
            "table_name": "table_2",
            "display_name": "table_2",
        }
    ]
    columns_by_table = {
        table_1: [
            {
                "column_id": col_1,
                "table_id": table_1,
                "column_name": "id",
                "data_type": "int",
                "udt_name": None,
                "default_sql": "generated by default as identity",
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ]
    }

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, [], columns_by_table)

    sql_output, _ = service._generate_sql(conn, str(uuid4()), "public")

    assert "id int GENERATED BY DEFAULT AS IDENTITY NOT NULL" in sql_output
    assert "DEFAULT generated by default as identity" not in sql_output


def test_generate_sql_drops_identity_clause_for_non_integer_types():
    table_1 = str(uuid4())
    col_1 = str(uuid4())

    tables = [
        {
            "table_id": table_1,
            "schema_name": "public",
            "table_name": "table_2",
            "display_name": "table_2",
        }
    ]
    columns_by_table = {
        table_1: [
            {
                "column_id": col_1,
                "table_id": table_1,
                "column_name": "id",
                "data_type": "text",
                "udt_name": None,
                "default_sql": "generated by default as identity",
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ]
    }

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, [], columns_by_table)

    sql_output, _ = service._generate_sql(conn, str(uuid4()), "public")

    assert "id text NOT NULL" in sql_output
    assert "generated by default as identity" not in sql_output
    assert "-- WARNING: dropped identity clause for " in sql_output


def test_generate_sql_skips_fk_when_target_not_unique():
    table_1 = str(uuid4())
    table_2 = str(uuid4())
    col_1 = str(uuid4())
    col_2 = str(uuid4())

    tables = [
        {"table_id": table_1, "schema_name": "public", "table_name": "child", "display_name": "child"},
        {"table_id": table_2, "schema_name": "public", "table_name": "parent", "display_name": "parent"},
    ]
    columns_by_table = {
        table_1: [
            {
                "column_id": col_1,
                "table_id": table_1,
                "column_name": "parent_ref",
                "data_type": "text",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": True,
                "is_primary_key": False,
                "is_unique": False,
            }
        ],
        table_2: [
            {
                "column_id": col_2,
                "table_id": table_2,
                "column_name": "parent_code",
                "data_type": "text",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": True,
                "is_primary_key": False,
                "is_unique": False,
            }
        ],
    }
    relationships = [
        {
            "relationship_id": str(uuid4()),
            "name": "fk_child_parent",
            "from_table_id": table_1,
            "from_column_id": col_1,
            "to_table_id": table_2,
            "to_column_id": col_2,
            "on_update_action": "NO ACTION",
            "on_delete_action": "NO ACTION",
        }
    ]

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, relationships, columns_by_table)

    sql_output, statement_count = service._generate_sql(conn, str(uuid4()), "public")

    assert statement_count == 2
    assert "ALTER TABLE" not in sql_output
    assert "is not PRIMARY KEY or UNIQUE" in sql_output


def test_generate_sql_skips_fk_when_types_incompatible():
    table_1 = str(uuid4())
    table_2 = str(uuid4())
    col_1 = str(uuid4())
    col_2 = str(uuid4())

    tables = [
        {"table_id": table_1, "schema_name": "public", "table_name": "child", "display_name": "child"},
        {"table_id": table_2, "schema_name": "public", "table_name": "parent", "display_name": "parent"},
    ]
    columns_by_table = {
        table_1: [
            {
                "column_id": col_1,
                "table_id": table_1,
                "column_name": "parent_id",
                "data_type": "uuid",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": True,
                "is_primary_key": False,
                "is_unique": False,
            }
        ],
        table_2: [
            {
                "column_id": col_2,
                "table_id": table_2,
                "column_name": "id",
                "data_type": "text",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ],
    }
    relationships = [
        {
            "relationship_id": str(uuid4()),
            "name": "fk_child_parent",
            "from_table_id": table_1,
            "from_column_id": col_1,
            "to_table_id": table_2,
            "to_column_id": col_2,
            "on_update_action": "NO ACTION",
            "on_delete_action": "NO ACTION",
        }
    ]

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, relationships, columns_by_table)

    sql_output, statement_count = service._generate_sql(conn, str(uuid4()), "public")

    assert statement_count == 2
    assert "ALTER TABLE" not in sql_output
    assert "due to incompatible types uuid -> text" in sql_output


def test_generate_sql_quotes_only_required_identifiers():
    table_1 = str(uuid4())
    col_1 = str(uuid4())

    tables = [
        {"table_id": table_1, "schema_name": "public", "table_name": "table_2", "display_name": "table_2"},
    ]
    columns_by_table = {
        table_1: [
            {
                "column_id": col_1,
                "table_id": table_1,
                "column_name": "23",
                "data_type": "text",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": True,
                "is_primary_key": False,
                "is_unique": False,
            }
        ]
    }

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, [], columns_by_table)

    sql_output, statement_count = service._generate_sql(conn, str(uuid4()), "public")

    assert statement_count == 1
    assert "CREATE TABLE IF NOT EXISTS public.table_2" in sql_output
    assert '"23" text' in sql_output
