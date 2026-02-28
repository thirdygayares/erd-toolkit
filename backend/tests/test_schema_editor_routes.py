from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.features.schema_editor.routers import get_schema_editor_service


class StubSchemaEditorService:
    def __init__(self):
        self.table_id = uuid4()
        self.column_id = uuid4()

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
            "from_table_id": uuid4(),
            "from_column_id": uuid4(),
            "to_table_id": uuid4(),
            "to_column_id": uuid4(),
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


def test_delete_relationship(client, app):
    app.dependency_overrides[get_schema_editor_service] = lambda: StubSchemaEditorService()

    response = client.delete(
        f"/api/v1/diagrams/{uuid4()}/relationships/{uuid4()}",
    )

    assert response.status_code == 200
    assert response.json()["name"] == "fk_user_company"
