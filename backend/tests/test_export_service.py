from __future__ import annotations

from uuid import uuid4

from app.core.errors import ValidationError
from app.features.export.services import ExportService


class _FakeCursor:
    def __init__(
        self,
        tables: list[dict],
        relationships: list[dict],
        columns_by_table: dict[str, list[dict]],
        indexes_by_table: dict[str, list[dict]] | list[dict] | None = None,
        custom_types: list[dict] | None = None,
    ):
        if isinstance(indexes_by_table, list) and custom_types is None:
            custom_types = indexes_by_table
            indexes_by_table = None

        self._tables = tables
        self._relationships = relationships
        self._columns_by_table = columns_by_table
        self._indexes_by_table = indexes_by_table or {}
        self._custom_types = custom_types or []
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
        if "fn_diagram_get_custom_types" in self._last_query:
            return self._custom_types
        if "fn_export_get_columns" in self._last_query:
            table_id = str(self._last_params["table_id"])
            return self._columns_by_table.get(table_id, [])
        if "fn_export_get_indexes_v1" in self._last_query:
            table_id = str(self._last_params["table_id"])
            return self._indexes_by_table.get(table_id, [])
        return []


class _FakeConnection:
    def __init__(
        self,
        tables: list[dict],
        relationships: list[dict],
        columns_by_table: dict[str, list[dict]],
        indexes_by_table: dict[str, list[dict]] | list[dict] | None = None,
        custom_types: list[dict] | None = None,
    ):
        if isinstance(indexes_by_table, list) and custom_types is None:
            custom_types = indexes_by_table
            indexes_by_table = None

        self._tables = tables
        self._relationships = relationships
        self._columns_by_table = columns_by_table
        self._indexes_by_table = indexes_by_table or {}
        self._custom_types = custom_types or []

    def cursor(self):
        return _FakeCursor(
            self._tables,
            self._relationships,
            self._columns_by_table,
            self._indexes_by_table,
            self._custom_types,
        )


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
    assert "CREATE TABLE IF NOT EXISTS public.users (" not in sql_output


def test_generate_sql_renders_user_indexes():
    table_id = str(uuid4())
    column_id = str(uuid4())
    index_id = str(uuid4())

    tables = [
        {
            "table_id": table_id,
            "schema_name": "public",
            "table_name": "customers",
            "display_name": "Customers",
        }
    ]
    columns_by_table = {
        table_id: [
            {
                "column_id": column_id,
                "table_id": table_id,
                "column_name": "customer_id",
                "data_type": "uuid",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ]
    }
    indexes_by_table = {
        table_id: [
            {
                "index_id": index_id,
                "table_id": table_id,
                "index_name": "customers_customer_id_idx",
                "method": "btree",
                "is_unique": False,
                "comment_text": "lookup",
                "source": "user",
                "column_ids": [column_id],
                "column_names": ["customer_id"],
            }
        ]
    }

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, [], columns_by_table, indexes_by_table)

    sql_output, statement_count = service._generate_sql(conn, str(uuid4()), "public")

    assert statement_count == 3
    assert "DROP INDEX IF EXISTS public.customers_customer_id_idx;" in sql_output
    assert (
        "CREATE INDEX customers_customer_id_idx ON public.customers USING btree (customer_id);"
        in sql_output
    )


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


def test_generate_sql_renders_custom_enum_types_before_tables():
    table_id = str(uuid4())
    column_id = str(uuid4())

    tables = [
        {
            "table_id": table_id,
            "schema_name": "public",
            "table_name": "orders",
            "display_name": "Orders",
        }
    ]
    columns_by_table = {
        table_id: [
            {
                "column_id": column_id,
                "table_id": table_id,
                "column_name": "status",
                "data_type": "USER-DEFINED",
                "udt_name": "order_status",
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": False,
                "is_unique": False,
            }
        ]
    }
    custom_types = [
        {
            "custom_type_id": str(uuid4()),
            "diagram_id": str(uuid4()),
            "schema_name": "public",
            "type_name": "order_status",
            "kind": "enum",
            "enum_values": ["draft", "paid", "shipped"],
        }
    ]

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, [], columns_by_table, custom_types)

    sql_output, statement_count = service._generate_sql(conn, str(uuid4()), "public")

    assert statement_count == 2
    assert "CREATE TYPE public.order_status AS ENUM ('draft', 'paid', 'shipped');" in sql_output
    assert "status order_status NOT NULL" in sql_output
    assert sql_output.index("CREATE TYPE public.order_status") < sql_output.index(
        "CREATE TABLE IF NOT EXISTS public.orders"
    )


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


def test_generate_sql_filters_source_schemas_when_export_all_is_false():
    public_table = str(uuid4())
    sales_table = str(uuid4())
    public_col = str(uuid4())
    sales_col = str(uuid4())

    tables = [
        {
            "table_id": public_table,
            "schema_name": "public",
            "table_name": "users",
            "display_name": "users",
        },
        {
            "table_id": sales_table,
            "schema_name": "sales",
            "table_name": "orders",
            "display_name": "orders",
        },
    ]
    columns_by_table = {
        public_table: [
            {
                "column_id": public_col,
                "table_id": public_table,
                "column_name": "id",
                "data_type": "uuid",
                "udt_name": None,
                "default_sql": None,
                "is_nullable": False,
                "is_primary_key": True,
                "is_unique": True,
            }
        ],
        sales_table: [
            {
                "column_id": sales_col,
                "table_id": sales_table,
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

    sql_output, statement_count = service._generate_sql(
        conn,
        str(uuid4()),
        "public",
        source_schema_names=["public"],
        export_all_schemas=False,
    )

    assert statement_count == 1
    assert "CREATE TABLE IF NOT EXISTS public.users" in sql_output
    assert "CREATE TABLE IF NOT EXISTS public.orders" not in sql_output


def test_generate_sql_raises_for_unknown_source_schema_selection():
    table_1 = str(uuid4())
    col_1 = str(uuid4())

    tables = [
        {
            "table_id": table_1,
            "schema_name": "public",
            "table_name": "users",
            "display_name": "users",
        }
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
        ]
    }

    service = ExportService(db=None)  # type: ignore[arg-type]
    conn = _FakeConnection(tables, [], columns_by_table)

    try:
        service._generate_sql(
            conn,
            str(uuid4()),
            "public",
            source_schema_names=["analytics"],
            export_all_schemas=False,
        )
    except ValidationError as exc:
        assert "Unknown source schema selection" in str(exc)
    else:
        raise AssertionError("expected ValidationError for unknown source schema")


def test_build_dictionary_rows_table_grid_includes_example_and_fk_reference():
    users_table_id = str(uuid4())
    orders_table_id = str(uuid4())
    users_pk_id = str(uuid4())
    orders_fk_id = str(uuid4())

    tables = [
        {
            "table_id": users_table_id,
            "schema_name": "public",
            "table_name": "users",
        },
        {
            "table_id": orders_table_id,
            "schema_name": "public",
            "table_name": "orders",
        },
    ]
    columns_by_table = {
        users_table_id: [
            {
                "column_id": users_pk_id,
                "column_name": "id",
                "data_type": "uuid",
                "udt_name": None,
                "is_nullable": False,
                "default_sql": "gen_random_uuid()",
                "example_value": "9d0e",
                "is_unique": True,
                "is_primary_key": True,
                "comment_text": "primary id",
            }
        ],
        orders_table_id: [
            {
                "column_id": orders_fk_id,
                "column_name": "user_id",
                "data_type": "uuid",
                "udt_name": None,
                "is_nullable": False,
                "default_sql": None,
                "example_value": "9d0e",
                "is_unique": False,
                "is_primary_key": False,
                "comment_text": "owner",
            }
        ],
    }
    relationships = [
        {
            "relationship_id": str(uuid4()),
            "name": "fk_orders_user",
            "from_table_id": orders_table_id,
            "from_column_id": orders_fk_id,
            "to_table_id": users_table_id,
            "to_column_id": users_pk_id,
        }
    ]

    service = ExportService(db=None)  # type: ignore[arg-type]
    rows = service._build_dictionary_rows(  # pylint: disable=protected-access
        tables=tables,
        relationships=relationships,
        custom_types=[],
        columns_by_table=columns_by_table,
        layout="table_grid",
        include_enums=False,
    )

    assert rows[0] == [
        "Schema",
        "Table",
        "Field",
        "Type",
        "Not Null",
        "Default",
        "Example",
        "Unique",
        "PK",
        "FK",
        "Description",
    ]
    assert ["public", "orders", "user_id", "uuid", "Yes", "", "9d0e", "No", "No", "public.users.id", "owner"] in rows


def test_build_dictionary_rows_section_sheet_uses_grouped_layout():
    table_id = str(uuid4())
    column_id = str(uuid4())
    tables = [
        {
            "table_id": table_id,
            "schema_name": "public",
            "table_name": "users",
        }
    ]
    columns_by_table = {
        table_id: [
            {
                "column_id": column_id,
                "column_name": "id",
                "data_type": "uuid",
                "udt_name": None,
                "is_nullable": False,
                "default_sql": "gen_random_uuid()",
                "example_value": "9d0e",
                "is_unique": True,
                "is_primary_key": True,
                "comment_text": "primary id",
            }
        ]
    }

    service = ExportService(db=None)  # type: ignore[arg-type]
    rows = service._build_dictionary_rows(  # pylint: disable=protected-access
        tables=tables,
        relationships=[],
        custom_types=[],
        columns_by_table=columns_by_table,
        layout="section_sheet",
        include_enums=False,
    )

    assert rows[0][0] == "public.users"
    assert rows[1] == [
        "Key",
        "Field",
        "Type",
        "Not Null",
        "Default",
        "Description",
        "Example",
        "FK",
    ]
    assert rows[2][:4] == ["PK", "id", "uuid", "NOT NULL"]
