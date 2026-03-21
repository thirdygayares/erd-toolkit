from __future__ import annotations

from uuid import uuid4

from app.features.export.routers import get_export_service
from app.features.introspection.routers import get_introspection_service


class StubIntrospectionService:
    def test_postgres_connection(self, diagram_id, payload, ctx):
        return {
            "status": "ok",
            "database_name": payload.database_name,
            "current_user": payload.username,
            "server_version": "PostgreSQL 16",
        }

    def list_postgres_schemas(self, diagram_id, payload, ctx):
        return {
            "status": "ok",
            "schemas": ["public", "sales", "ops"],
            "default_schema": "public",
        }

    def import_postgres(self, diagram_id, payload, ctx):
        return {
            "import_job_id": uuid4(),
            "connection_id": uuid4(),
            "status": "success",
            "table_count": 2,
            "column_count": 8,
            "relationship_count": 1,
        }


class StubExportService:
    def export_sql(self, diagram_id, payload, ctx):
        return {
            "export_job_id": uuid4(),
            "status": "success",
            "statement_count": 2,
            "sql_output": 'CREATE TABLE "public"."users" (\n  "id" uuid NOT NULL\n);\n',
        }

    def export_dictionary(self, diagram_id, payload, ctx):
        return {
            "filename": "erd_data_dictionary.csv",
            "content": b"Schema,Table\\npublic,users\\n",
            "content_type": "text/csv; charset=utf-8",
        }


def test_import_postgres_endpoint(client, app):
    app.dependency_overrides[get_introspection_service] = lambda: StubIntrospectionService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/import/postgres",
        json={
            "host": "localhost",
            "port": 5432,
            "database_name": "sample",
            "username": "postgres",
            "password": "postgres",
            "schema_names": ["public"],
            "import_all_schemas": False,
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "success"


def test_test_postgres_connection_endpoint(client, app):
    app.dependency_overrides[get_introspection_service] = lambda: StubIntrospectionService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/import/postgres/test",
        json={
            "host": "localhost",
            "port": 5432,
            "database_name": "sample",
            "username": "postgres",
            "password": "postgres",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_list_postgres_schemas_endpoint(client, app):
    app.dependency_overrides[get_introspection_service] = lambda: StubIntrospectionService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/import/postgres/schemas",
        json={
            "host": "localhost",
            "port": 5432,
            "database_name": "sample",
            "username": "postgres",
            "password": "postgres",
        },
    )

    assert response.status_code == 200
    assert response.json()["schemas"] == ["public", "sales", "ops"]


def test_export_sql_endpoint(client, app):
    app.dependency_overrides[get_export_service] = lambda: StubExportService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/export/sql",
        json={"target_schema": "public"},
    )

    assert response.status_code == 201
    assert response.json()["statement_count"] == 2


def test_export_dictionary_endpoint(client, app):
    app.dependency_overrides[get_export_service] = lambda: StubExportService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/export/dictionary",
        json={
            "source_schema_names": ["public"],
            "export_all_schemas": False,
            "layout": "table_grid",
            "file_type": "csv",
            "include_enums": True,
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert "Schema,Table" in response.text
