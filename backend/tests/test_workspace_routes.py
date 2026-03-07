from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.features.workspace.routers import get_workspace_service


class StubWorkspaceService:
    def create_workspace(self, payload, ctx):
        return {
            "workspace_id": uuid4(),
            "name": payload.name,
            "slug": payload.slug or "demo-workspace",
            "owner_user_id": None,
            "workspace_mode": payload.workspace_mode,
            "is_active": True,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def list_workspaces(self, ctx):
        return [
            {
                "workspace_id": uuid4(),
                "name": "Default Workspace",
                "slug": "default-workspace",
                "owner_user_id": uuid4(),
                "workspace_mode": "personal",
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ]

    def ensure_default_workspace(self, ctx):
        return {
            "workspace_id": uuid4(),
            "name": "Default Workspace",
            "slug": "default-workspace",
            "owner_user_id": uuid4(),
            "workspace_mode": "personal",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
            "was_created": False,
        }


def test_create_workspace(client, app):
    app.dependency_overrides[get_workspace_service] = lambda: StubWorkspaceService()

    response = client.post(
        "/api/v1/workspaces",
        json={"name": "Demo Workspace", "workspace_mode": "guest"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Demo Workspace"
    assert body["workspace_mode"] == "guest"


def test_list_workspaces(client, app):
    app.dependency_overrides[get_workspace_service] = lambda: StubWorkspaceService()

    response = client.get("/api/v1/workspaces")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["name"] == "Default Workspace"


def test_ensure_default_workspace(client, app):
    app.dependency_overrides[get_workspace_service] = lambda: StubWorkspaceService()

    response = client.post("/api/v1/workspaces/ensure-default")

    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Default Workspace"
    assert body["was_created"] is False
