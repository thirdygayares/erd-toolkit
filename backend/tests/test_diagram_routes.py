from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from psycopg.errors import InsufficientPrivilege

from app.features.diagram.routers import get_diagram_service


class StubDiagramService:
    def __init__(self):
        self.diagram_id = uuid4()
        self.workspace_id = uuid4()
        self.project_id = uuid4()
        self.custom_type_id = uuid4()

    def create_diagram(self, payload, ctx):
        return {
            "diagram_id": self.diagram_id,
            "workspace_id": payload.workspace_id,
            "project_id": payload.project_id,
            "name": payload.name,
            "description": payload.description,
            "version_no": 1,
            "viewport_x": 0,
            "viewport_y": 0,
            "viewport_zoom": 1,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def list_diagrams_by_workspace(self, workspace_id, ctx):
        return [
            {
                "diagram_id": self.diagram_id,
                "workspace_id": workspace_id,
                "project_id": self.project_id,
                "name": "Demo Diagram",
                "description": None,
                "version_no": 1,
                "viewport_x": 0,
                "viewport_y": 0,
                "viewport_zoom": 1,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ]

    def get_diagram_detail(self, diagram_id, ctx):
        table_id = uuid4()
        column_id = uuid4()
        return {
            "diagram": {
                "diagram_id": diagram_id,
                "workspace_id": self.workspace_id,
                "project_id": self.project_id,
                "name": "Demo Diagram",
                "description": None,
                "version_no": 1,
                "viewport_x": 0,
                "viewport_y": 0,
                "viewport_zoom": 1,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            },
            "tables": [
                {
                    "table_id": table_id,
                    "diagram_id": diagram_id,
                    "schema_name": "public",
                    "table_name": "users",
                    "display_name": "Users",
                    "pos_x": 10,
                    "pos_y": 20,
                    "width": None,
                    "height": None,
                    "color_hex": None,
                    "columns": [
                        {
                            "column_id": column_id,
                            "table_id": table_id,
                            "column_name": "id",
                            "ordinal_position": 1,
                            "data_type": "uuid",
                            "udt_name": None,
                            "is_nullable": False,
                            "default_sql": None,
                            "is_primary_key": True,
                            "is_unique": True,
                            "example_value": None,
                        }
                    ],
                }
            ],
            "relationships": [],
            "custom_types": [
                {
                    "custom_type_id": self.custom_type_id,
                    "diagram_id": diagram_id,
                    "schema_name": "public",
                    "type_name": "order_status",
                    "kind": "enum",
                    "enum_values": ["draft", "paid", "shipped"],
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                }
            ],
        }

    def create_snapshot(self, diagram_id, payload, ctx):
        return {
            "snapshot_id": uuid4(),
            "diagram_id": diagram_id,
            "version_no": 2,
            "label": payload.label,
            "snapshot_payload": payload.snapshot_payload,
            "created_at": datetime.now(timezone.utc),
        }


def test_create_diagram(client, app):
    service = StubDiagramService()
    app.dependency_overrides[get_diagram_service] = lambda: service

    response = client.post(
        "/api/v1/diagrams",
        json={
            "workspace_id": str(uuid4()),
            "project_id": str(uuid4()),
            "name": "Main Diagram",
        },
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Main Diagram"


def test_get_diagram_detail(client, app):
    service = StubDiagramService()
    app.dependency_overrides[get_diagram_service] = lambda: service

    response = client.get(f"/api/v1/diagrams/{uuid4()}")

    assert response.status_code == 200
    assert len(response.json()["tables"]) == 1
    assert response.json()["custom_types"][0]["type_name"] == "order_status"


def test_create_snapshot(client, app):
    service = StubDiagramService()
    app.dependency_overrides[get_diagram_service] = lambda: service

    response = client.post(
        f"/api/v1/diagrams/{uuid4()}/snapshots",
        json={"label": "v1", "snapshot_payload": {"nodes": []}},
    )

    assert response.status_code == 201
    assert response.json()["label"] == "v1"


class ForbiddenDiagramService(StubDiagramService):
    def create_diagram(self, payload, ctx):
        raise InsufficientPrivilege(
            f"forbidden to create diagram for project {payload.project_id}"
        )


def test_create_diagram_returns_403_when_forbidden(client, app):
    service = ForbiddenDiagramService()
    app.dependency_overrides[get_diagram_service] = lambda: service

    response = client.post(
        "/api/v1/diagrams",
        json={
            "workspace_id": str(uuid4()),
            "project_id": str(uuid4()),
            "name": "Main Diagram",
        },
    )

    assert response.status_code == 403
    assert "forbidden to create diagram" in response.json()["detail"].lower()
