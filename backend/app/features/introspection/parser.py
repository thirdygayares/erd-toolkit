from __future__ import annotations

from dataclasses import dataclass
import itertools
import re

from sqlglot import exp, parse
from sqlglot.errors import ErrorLevel, ParseError


@dataclass(slots=True)
class SchemaImportTable:
    schema_name: str
    table_name: str
    display_name: str


@dataclass(slots=True)
class SchemaImportColumn:
    schema_name: str
    table_name: str
    column_name: str
    ordinal_position: int
    data_type: str
    udt_name: str | None
    is_nullable: bool
    column_default: str | None
    is_primary_key: bool = False
    is_unique: bool = False


@dataclass(slots=True)
class SchemaImportForeignKey:
    name: str
    from_schema: str
    from_table: str
    from_column: str
    to_schema: str
    to_table: str
    to_column: str
    on_update_action: str = "NO ACTION"
    on_delete_action: str = "NO ACTION"


@dataclass(slots=True)
class SchemaImportData:
    schema_names: list[str]
    tables: list[SchemaImportTable]
    columns: list[SchemaImportColumn]
    foreign_keys: list[SchemaImportForeignKey]


def parse_postgres_ddl(sql_text: str) -> SchemaImportData:
    prepared_sql = _sanitize_sql_text(sql_text)
    if not prepared_sql.strip():
        raise ValueError("SQL input is empty.")

    try:
        statements = parse(prepared_sql, read="postgres", error_level=ErrorLevel.IGNORE)
    except ParseError as exc:
        raise ValueError(f"Unable to parse SQL input: {exc}") from exc

    table_order: list[tuple[str, str]] = []
    table_seen: set[tuple[str, str]] = set()
    columns_by_table: dict[tuple[str, str], list[SchemaImportColumn]] = {}
    columns_by_key: dict[tuple[str, str, str], SchemaImportColumn] = {}
    primary_keys: set[tuple[str, str, str]] = set()
    unique_keys: set[tuple[str, str, str]] = set()
    foreign_keys: list[SchemaImportForeignKey] = []
    fk_seq = itertools.count(1)

    def ensure_table(schema_name: str, table_name: str) -> tuple[str, str]:
        key = (schema_name, table_name)
        if key not in table_seen:
            table_seen.add(key)
            table_order.append(key)
            columns_by_table[key] = []
        return key

    def add_foreign_keys(
        *,
        constraint_name: str | None,
        from_schema: str,
        from_table: str,
        source_columns: list[str],
        reference: exp.Reference,
    ) -> None:
        reference_target = reference.args.get("this")
        if isinstance(reference_target, exp.Schema):
            target_table_expr = reference_target.this
            target_columns = _extract_column_names(reference_target.expressions or [])
        elif isinstance(reference_target, exp.Table):
            target_table_expr = reference_target
            target_columns = []
        else:
            return

        if not isinstance(target_table_expr, exp.Table):
            return

        to_schema = _identifier_name(target_table_expr.args.get("db")) or "public"
        to_table = _identifier_name(target_table_expr.this)
        if not to_table:
            return

        pair_count = min(len(source_columns), len(target_columns))
        if pair_count <= 0:
            return

        on_update_action, on_delete_action = _extract_fk_actions(reference.args.get("options") or [])
        base_name = (
            constraint_name
            or f"fk_{from_table}_{next(fk_seq)}_{to_table}"
        )

        for index in range(pair_count):
            fk_name = base_name if pair_count == 1 else f"{base_name}_{index + 1}"
            foreign_keys.append(
                SchemaImportForeignKey(
                    name=fk_name,
                    from_schema=from_schema,
                    from_table=from_table,
                    from_column=source_columns[index],
                    to_schema=to_schema,
                    to_table=to_table,
                    to_column=target_columns[index],
                    on_update_action=on_update_action,
                    on_delete_action=on_delete_action,
                )
            )

    def apply_table_constraint(
        *,
        schema_name: str,
        table_name: str,
        constraint_name: str | None,
        constraint: exp.Expression,
    ) -> None:
        if isinstance(constraint, exp.PrimaryKey):
            for column_name in _extract_column_names(constraint.args.get("expressions") or []):
                key = (schema_name, table_name, column_name)
                primary_keys.add(key)
                unique_keys.add(key)
            return

        if isinstance(constraint, exp.UniqueColumnConstraint):
            unique_columns = []
            if constraint.args.get("expressions"):
                unique_columns = _extract_column_names(constraint.args.get("expressions") or [])
            elif isinstance(constraint.args.get("this"), exp.Schema):
                unique_columns = _extract_column_names(
                    (constraint.args.get("this").expressions or [])
                )
            else:
                unique_columns = _extract_column_names([constraint.args.get("this")])

            for column_name in unique_columns:
                unique_keys.add((schema_name, table_name, column_name))
            return

        if isinstance(constraint, exp.ForeignKey):
            source_columns = _extract_column_names(constraint.args.get("expressions") or [])
            reference = constraint.args.get("reference")
            if source_columns and isinstance(reference, exp.Reference):
                add_foreign_keys(
                    constraint_name=constraint_name,
                    from_schema=schema_name,
                    from_table=table_name,
                    source_columns=source_columns,
                    reference=reference,
                )

    def unfold_constraint_expressions(expression: exp.Expression) -> list[tuple[str | None, exp.Expression]]:
        if isinstance(expression, exp.Constraint):
            constraint_name = _identifier_name(expression.this) or None
            nested = []
            for item in expression.args.get("expressions") or []:
                if isinstance(item, exp.Expression):
                    nested.append((constraint_name, item))
            return nested

        if isinstance(expression, (exp.PrimaryKey, exp.UniqueColumnConstraint, exp.ForeignKey)):
            return [(None, expression)]

        return []

    for statement in statements:
        if not isinstance(statement, exp.Expression):
            continue

        if isinstance(statement, exp.Create):
            kind = str(statement.args.get("kind") or "").upper()
            if kind != "TABLE":
                continue

            target = statement.this
            if isinstance(target, exp.Schema) and isinstance(target.this, exp.Table):
                table_expr = target.this
                definitions = list(target.expressions or [])
            elif isinstance(target, exp.Table):
                table_expr = target
                definitions = []
            else:
                continue

            schema_name = _identifier_name(table_expr.args.get("db")) or "public"
            table_name = _identifier_name(table_expr.this)
            if not table_name:
                continue

            table_key = ensure_table(schema_name, table_name)

            for definition in definitions:
                if isinstance(definition, exp.ColumnDef):
                    column_name = _identifier_name(definition.this)
                    if not column_name:
                        continue

                    data_type, udt_name = _normalize_data_type(definition.args.get("kind"))
                    ordinal_position = len(columns_by_table[table_key]) + 1
                    column = SchemaImportColumn(
                        schema_name=schema_name,
                        table_name=table_name,
                        column_name=column_name,
                        ordinal_position=ordinal_position,
                        data_type=data_type,
                        udt_name=udt_name,
                        is_nullable=True,
                        column_default=None,
                    )

                    for constraint in definition.args.get("constraints") or []:
                        if not isinstance(constraint, exp.ColumnConstraint):
                            continue

                        kind_expression = constraint.args.get("kind")
                        if isinstance(kind_expression, exp.NotNullColumnConstraint):
                            column.is_nullable = False
                        elif isinstance(kind_expression, exp.PrimaryKeyColumnConstraint):
                            key = (schema_name, table_name, column_name)
                            primary_keys.add(key)
                            unique_keys.add(key)
                            column.is_nullable = False
                        elif isinstance(kind_expression, exp.UniqueColumnConstraint):
                            unique_keys.add((schema_name, table_name, column_name))
                        elif isinstance(kind_expression, exp.DefaultColumnConstraint):
                            if kind_expression.this is not None:
                                column.column_default = kind_expression.this.sql(dialect="postgres")
                        elif isinstance(kind_expression, exp.GeneratedAsIdentityColumnConstraint):
                            column.column_default = kind_expression.sql(dialect="postgres").lower()
                            column.is_nullable = False
                        elif isinstance(kind_expression, exp.Reference):
                            add_foreign_keys(
                                constraint_name=None,
                                from_schema=schema_name,
                                from_table=table_name,
                                source_columns=[column_name],
                                reference=kind_expression,
                            )

                    columns_by_table[table_key].append(column)
                    columns_by_key[(schema_name, table_name, column_name)] = column
                    continue

                for constraint_name, constraint_expr in unfold_constraint_expressions(definition):
                    apply_table_constraint(
                        schema_name=schema_name,
                        table_name=table_name,
                        constraint_name=constraint_name,
                        constraint=constraint_expr,
                    )
            continue

        if isinstance(statement, exp.Alter) and isinstance(statement.this, exp.Table):
            schema_name = _identifier_name(statement.this.args.get("db")) or "public"
            table_name = _identifier_name(statement.this.this)
            if not table_name or (schema_name, table_name) not in table_seen:
                continue

            for action in statement.args.get("actions") or []:
                if not isinstance(action, exp.AddConstraint):
                    continue
                for expression in action.args.get("expressions") or []:
                    if not isinstance(expression, exp.Expression):
                        continue
                    for constraint_name, constraint_expr in unfold_constraint_expressions(expression):
                        apply_table_constraint(
                            schema_name=schema_name,
                            table_name=table_name,
                            constraint_name=constraint_name,
                            constraint=constraint_expr,
                        )

    if not table_order:
        raise ValueError("No CREATE TABLE statements found in SQL input.")

    for key, column in columns_by_key.items():
        if key in primary_keys:
            column.is_primary_key = True
            column.is_unique = True
            column.is_nullable = False
        elif key in unique_keys:
            column.is_unique = True

    ordered_columns: list[SchemaImportColumn] = []
    for table_key in table_order:
        ordered_columns.extend(columns_by_table.get(table_key, []))

    schema_names = _order_schemas(table_order)
    tables = [
        SchemaImportTable(
            schema_name=schema_name,
            table_name=table_name,
            display_name=table_name,
        )
        for schema_name, table_name in table_order
    ]

    return SchemaImportData(
        schema_names=schema_names,
        tables=tables,
        columns=ordered_columns,
        foreign_keys=foreign_keys,
    )


def _sanitize_sql_text(sql_text: str) -> str:
    lines = sql_text.splitlines()
    sanitized: list[str] = []
    in_copy_data = False

    for line in lines:
        stripped = line.strip()

        if in_copy_data:
            if stripped == r"\.":
                in_copy_data = False
            continue

        if re.match(r"^COPY\s+.+\s+FROM\s+stdin;?$", stripped, flags=re.IGNORECASE):
            in_copy_data = True
            continue

        if stripped.startswith("\\"):
            continue

        sanitized.append(line)

    return "\n".join(sanitized)


def _identifier_name(identifier: object) -> str:
    if identifier is None:
        return ""

    if isinstance(identifier, exp.Identifier):
        return identifier.name

    if isinstance(identifier, exp.Column):
        return identifier.name

    if isinstance(identifier, exp.Table):
        return identifier.name

    if isinstance(identifier, exp.Expression):
        name = getattr(identifier, "name", "")
        if isinstance(name, str) and name:
            return name
        rendered = identifier.sql(dialect="postgres")
        return rendered.split(".")[-1].strip().strip('"')

    if isinstance(identifier, str):
        return identifier.strip().strip('"')

    return ""


def _extract_column_names(expressions: list[object]) -> list[str]:
    columns: list[str] = []

    for expression in expressions:
        if isinstance(expression, exp.Schema):
            columns.extend(_extract_column_names(list(expression.expressions or [])))
            continue

        if isinstance(expression, exp.Expression):
            name = _identifier_name(expression)
            if name:
                columns.append(name)

    return columns


def _normalize_data_type(data_type: object) -> tuple[str, str | None]:
    if not isinstance(data_type, exp.DataType):
        return "text", None

    if data_type.this == exp.DataType.Type.ARRAY:
        nested_types = list(data_type.expressions or [])
        nested_type = nested_types[0] if nested_types else None
        nested_data_type, nested_udt_name = _normalize_data_type(nested_type)
        if nested_data_type == "USER-DEFINED":
            return "USER-DEFINED[]", nested_udt_name
        return f"{nested_data_type}[]", None

    if data_type.this == exp.DataType.Type.USERDEFINED:
        udt_name = None
        kind = data_type.args.get("kind")
        if isinstance(kind, exp.Identifier):
            udt_name = kind.name
        elif isinstance(kind, exp.Expression):
            udt_name = kind.sql(dialect="postgres").split(".")[-1].strip().strip('"')
        elif isinstance(kind, str):
            udt_name = kind.split(".")[-1].strip().strip('"')
        return "USER-DEFINED", udt_name or None

    return data_type.sql(dialect="postgres").lower(), None


def _extract_fk_actions(options: list[object]) -> tuple[str, str]:
    on_update_action = "NO ACTION"
    on_delete_action = "NO ACTION"

    for option in options:
        if isinstance(option, str):
            rendered = option
        elif isinstance(option, exp.Expression):
            rendered = option.sql(dialect="postgres")
        else:
            continue

        normalized = " ".join(rendered.upper().split())
        if normalized.startswith("ON UPDATE "):
            on_update_action = normalized.removeprefix("ON UPDATE ").strip()
        elif normalized.startswith("ON DELETE "):
            on_delete_action = normalized.removeprefix("ON DELETE ").strip()

    return on_update_action, on_delete_action


def _order_schemas(table_order: list[tuple[str, str]]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []
    for schema_name, _ in table_order:
        if schema_name not in seen:
            seen.add(schema_name)
            ordered.append(schema_name)
    return sorted(ordered, key=lambda item: (item != "public", item))
