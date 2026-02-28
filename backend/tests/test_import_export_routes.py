from __future__ import annotations

from uuid import uuid4

from app.features.export.routers import get_export_service
from app.features.introspection.routers import get_introspection_service


class StubIntrospectionService:
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
        },
    )

    assert response.status_code == 201
    assert response.json()["status"] == "success"


def test_export_sql_endpoint(client, app):
    app.dependency_overrides[get_export_service] = lambda: StubExportService()

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/export/sql",
        json={"target_schema": "public"},
    )

    assert response.status_code == 201
    assert response.json()["statement_count"] == 2
