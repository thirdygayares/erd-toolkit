from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.features.schema_editor.routers import get_schema_editor_service


class StubSchemaEditorService:
    def __init__(self):
        self.table_id = uuid4()
        self.column_id = uuid4()
        self.index_id = uuid4()
        self.custom_type_id = uuid4()

    def create_table(self, diagram_id, payload, ctx):
        return {
            "table_id": self.table_id,
            "diagram_id": diagram_id,
            "schema_name": payload.schema_name,
            "table_name": payload.table_name,
            "display_name": payload.display_name,
            "pos_x": payload.pos_x,
            "pos_y": payload.pos_y,
            "color_hex": payload.color_hex,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def update_table(self, diagram_id, table_id, payload, ctx):
        return {
            "table_id": table_id,
            "diagram_id": diagram_id,
            "schema_name": "public",
            "table_name": "users",
            "display_name": payload.display_name or "Users",
            "pos_x": payload.pos_x or 0,
            "pos_y": payload.pos_y or 0,
            "color_hex": payload.color_hex,
            "is_deleted": payload.is_deleted or False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def create_column(self, table_id, payload, ctx):
        return {
            "column_id": self.column_id,
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
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def update_column(self, table_id, column_id, payload, ctx):
        return {
            "column_id": column_id,
            "table_id": table_id,
            "column_name": payload.column_name or "id",
            "ordinal_position": payload.ordinal_position or 1,
            "data_type": payload.data_type or "uuid",
            "udt_name": payload.udt_name,
            "is_nullable": payload.is_nullable if payload.is_nullable is not None else False,
            "default_sql": payload.default_sql,
            "is_primary_key": payload.is_primary_key if payload.is_primary_key is not None else True,
            "is_unique": payload.is_unique if payload.is_unique is not None else True,
            "example_value": payload.example_value,
            "ui_width": payload.ui_width,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def delete_column(self, table_id, column_id, ctx):
        return {
            "column_id": column_id,
            "table_id": table_id,
            "column_name": "legacy_column",
            "ordinal_position": 2,
            "data_type": "text",
            "udt_name": None,
            "is_nullable": True,
            "default_sql": None,
            "is_primary_key": False,
            "is_unique": False,
            "example_value": None,
            "ui_width": None,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def create_custom_type(self, diagram_id, payload, ctx):
        return {
            "custom_type_id": self.custom_type_id,
            "diagram_id": diagram_id,
            "schema_name": payload.schema_name,
            "type_name": payload.type_name,
            "kind": "enum",
            "enum_values": payload.enum_values,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def create_index(self, table_id, payload, ctx):
        return {
            "index_id": str(self.index_id),
            "table_id": table_id,
            "index_name": payload.index_name,
            "method": payload.method,
            "is_unique": payload.is_unique,
            "comment_text": payload.comment_text,
            "source": "user",
            "column_ids": payload.column_ids,
            "column_names": ["customer_id"],
        }

    def update_index(self, table_id, index_id, payload, ctx):
        return {
            "index_id": index_id,
            "table_id": table_id,
            "index_name": payload.index_name,
            "method": payload.method,
            "is_unique": payload.is_unique,
            "comment_text": payload.comment_text,
            "source": "user",
            "column_ids": payload.column_ids,
            "column_names": ["customer_id", "email"],
        }

    def delete_index(self, table_id, index_id, ctx):
        return {
            "index_id": index_id,
            "table_id": table_id,
            "index_name": "customers_customer_id_idx",
            "method": "btree",
            "is_unique": False,
            "comment_text": None,
            "source": "user",
            "column_ids": [uuid4()],
            "column_names": ["customer_id"],
        }

    def update_custom_type(self, diagram_id, custom_type_id, payload, ctx):
        return {
            "custom_type_id": custom_type_id,
            "diagram_id": diagram_id,
            "schema_name": payload.schema_name or "public",
            "type_name": payload.type_name or "order_status",
            "kind": "enum",
            "enum_values": payload.enum_values or ["draft", "paid"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def delete_custom_type(self, diagram_id, custom_type_id, ctx):
        return {
            "custom_type_id": custom_type_id,
            "diagram_id": diagram_id,
            "schema_name": "public",
            "type_name": "order_status",
            "kind": "enum",
            "enum_values": ["draft", "paid"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def create_relationship(self, diagram_id, payload, ctx):
        return {
            "relationship_id": uuid4(),
            "diagram_id": diagram_id,
            "name": payload.name,
            "from_table_id": payload.from_table_id,
            "from_column_id": payload.from_column_id,
            "to_table_id": payload.to_table_id,
            "to_column_id": payload.to_column_id,
            "cardinality_from": payload.cardinality_from,
            "cardinality_to": payload.cardinality_to,
            "on_update_action": payload.on_update_action,
            "on_delete_action": payload.on_delete_action,
            "is_identifying": payload.is_identifying,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def update_relationship(self, diagram_id, relationship_id, payload, ctx):
        return {
            "relationship_id": relationship_id,
            "diagram_id": diagram_id,
            "name": payload.name or "fk_users_company",
            "from_table_id": payload.from_table_id or uuid4(),
            "from_column_id": payload.from_column_id or uuid4(),
            "to_table_id": payload.to_table_id or uuid4(),
            "to_column_id": payload.to_column_id or uuid4(),
            "cardinality_from": payload.cardinality_from or "N",
            "cardinality_to": payload.cardinality_to or "1",
            "on_update_action": payload.on_update_action or "NO ACTION",
            "on_delete_action": payload.on_delete_action or "NO ACTION",
            "is_identifying": payload.is_identifying if payload.is_identifying is not None else False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def delete_relationship(self, diagram_id, relationship_id, ctx):
        return {
            "relationship_id": relationship_id,
            "diagram_id": diagram_id,
            "name": "fk_user_company",
            "from_table_id": uuid4(),
            "from_column_id": uuid4(),
            "to_table_id": uuid4(),
            "to_column_id": uuid4(),
            "cardinality_from": "N",
            "cardinality_to": "1",
            "on_update_action": "NO ACTION",
            "on_delete_action": "CASCADE",
            "is_identifying": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }


def test_create_table(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/tables",
        json={"schema_name": "public", "table_name": "users", "pos_x": 1, "pos_y": 2},
    )

    assert response.status_code == 201
    assert response.json()["table_name"] == "users"


def test_create_relationship(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/relationships",
        json={
            "name": "fk_user_company",
            "from_table_id": str(uuid4()),
            "from_column_id": str(uuid4()),
            "to_table_id": str(uuid4()),
            "to_column_id": str(uuid4()),
            "cardinality_from": "N",
            "cardinality_to": "1",
            "on_update_action": "NO ACTION",
            "on_delete_action": "CASCADE",
        },
    )

    assert response.status_code == 201
    assert response.json()["name"] == "fk_user_company"


def test_create_column_with_ui_width(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/tables/{uuid4()}/columns",
        json={
            "column_name": "customer_name",
            "ordinal_position": 1,
            "data_type": "text",
            "is_nullable": False,
            "is_primary_key": False,
            "is_unique": False,
            "default_sql": "",
            "example_value": "Ada",
            "ui_width": 360,
        },
    )

    assert response.status_code == 201
    assert response.json()["column_name"] == "customer_name"
    assert response.json()["ui_width"] == 360


def test_update_column_with_ui_width(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.patch(
        f"/api/v1/diagrams/{uuid4()}/tables/{uuid4()}/columns/{uuid4()}",
        json={
            "ui_width": 420,
        },
    )

    assert response.status_code == 200
    assert response.json()["ui_width"] == 420


def test_create_index(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/tables/{uuid4()}/indexes",
        json={
            "index_name": "customers_customer_id_idx",
            "method": "btree",
            "is_unique": False,
            "comment_text": "lookup index",
            "column_ids": [str(uuid4())],
        },
    )

    assert response.status_code == 201
    assert response.json()["index_name"] == "customers_customer_id_idx"
    assert response.json()["source"] == "user"


def test_update_index(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()
    index_id = str(uuid4())

    response = client.patch(
        f"/api/v1/diagrams/{uuid4()}/tables/{uuid4()}/indexes/{index_id}",
        json={
            "index_name": "customers_customer_id_email_idx",
            "method": "btree",
            "is_unique": True,
            "comment_text": "updated",
            "column_ids": [str(uuid4()), str(uuid4())],
        },
    )

    assert response.status_code == 200
    assert response.json()["index_id"] == index_id
    assert response.json()["is_unique"] is True


def test_delete_index(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()
    index_id = str(uuid4())

    response = client.delete(
        f"/api/v1/diagrams/{uuid4()}/tables/{uuid4()}/indexes/{index_id}"
    )

    assert response.status_code == 200
    assert response.json()["index_id"] == index_id


def test_delete_column(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.delete(
        f"/api/v1/diagrams/{uuid4()}/tables/{uuid4()}/columns/{uuid4()}",
    )

    assert response.status_code == 200
    assert response.json()["column_name"] == "legacy_column"


def test_create_custom_type(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/custom-types",
        json={
            "schema_name": "public",
            "type_name": "order_status",
            "enum_values": ["draft", "paid", "shipped"],
        },
    )

    assert response.status_code == 201
    assert response.json()["type_name"] == "order_status"
    assert response.json()["enum_values"] == ["draft", "paid", "shipped"]


def test_update_custom_type(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()
    diagram_id = uuid4()
    custom_type_id = uuid4()

    response = client.patch(
        f"/api/v1/diagrams/{diagram_id}/custom-types/{custom_type_id}",
        json={
            "type_name": "payment_status",
            "enum_values": ["pending", "paid"],
        },
    )

    assert response.status_code == 200
    assert response.json()["type_name"] == "payment_status"
    assert response.json()["enum_values"] == ["pending", "paid"]


def test_delete_custom_type(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.delete(
        f"/api/v1/diagrams/{uuid4()}/custom-types/{uuid4()}",
    )

    assert response.status_code == 200
    assert response.json()["type_name"] == "order_status"


def test_delete_relationship(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.delete(
        f"/api/v1/diagrams/{uuid4()}/relationships/{uuid4()}",
    )

    assert response.status_code == 200
    assert response.json()["name"] == "fk_user_company"


def test_update_relationship_reconnect(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()
    from_table_id = str(uuid4())
    from_column_id = str(uuid4())
    to_table_id = str(uuid4())
    to_column_id = str(uuid4())

    response = client.patch(
        f"/api/v1/diagrams/{uuid4()}/relationships/{uuid4()}",
        json={
            "from_table_id": from_table_id,
            "from_column_id": from_column_id,
            "to_table_id": to_table_id,
            "to_column_id": to_column_id,
            "cardinality_from": "1",
            "cardinality_to": "N",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["from_table_id"] == from_table_id
    assert body["to_table_id"] == to_table_id
    assert body["cardinality_from"] == "1"
    assert body["cardinality_to"] == "N"
