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
