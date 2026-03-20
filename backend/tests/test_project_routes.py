from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.features.project.routers import get_project_service


class StubProjectService:
    def __init__(self):
        self.project_id = uuid4()
        self.workspace_id = uuid4()

    def create_project(self, payload, ctx):
        return {
            "project_id": self.project_id,
            "workspace_id": payload.workspace_id,
            "owner_user_id": None,
            "name": payload.name,
            "description": payload.description,
            "visibility": payload.visibility,
            "share_slug": payload.share_slug or "share-abc",
            "allow_anonymous_edit": payload.allow_anonymous_edit,
            "is_archived": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def get_project_by_share_slug(self, share_slug, ctx):
        return {
            "project_id": self.project_id,
            "workspace_id": self.workspace_id,
            "owner_user_id": None,
            "name": "Shared Project",
            "description": None,
            "visibility": "public",
            "share_slug": share_slug,
            "allow_anonymous_edit": True,
            "is_archived": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def set_visibility(self, project_id, payload, ctx):
        return {
            "project_id": project_id,
            "workspace_id": self.workspace_id,
            "owner_user_id": None,
            "name": "Shared Project",
            "description": None,
            "visibility": payload.visibility,
            "share_slug": "share-abc",
            "allow_anonymous_edit": payload.allow_anonymous_edit,
            "is_archived": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def get_project(self, project_id, ctx):
        return {
            "project_id": project_id,
            "workspace_id": self.workspace_id,
            "owner_user_id": None,
            "name": "Project",
            "description": None,
            "visibility": "public",
            "share_slug": "share-abc",
            "allow_anonymous_edit": True,
            "is_archived": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

    def list_projects(self, ctx):
        return [
            {
                "project_id": self.project_id,
                "workspace_id": self.workspace_id,
                "workspace_name": "Default Workspace",
                "workspace_mode": "personal",
                "name": "Project",
                "description": None,
                "visibility": "public",
                "share_slug": "share-abc",
                "allow_anonymous_edit": True,
                "is_archived": False,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        ]

    def duplicate_project(self, project_id, new_name, ctx):
        return {
            "project_id": self.project_id,
            "workspace_id": self.workspace_id,
            "owner_user_id": None,
            "name": new_name,
            "description": "Copied project",
            "visibility": "private",
            "share_slug": "share-abc-copy",
            "allow_anonymous_edit": False,
            "is_archived": False,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }


def test_create_project(client, app):
    service = StubProjectService()
    app.dependency_overrides[get_project_service] = lambda: service

    response = client.post(
        "/api/v1/projects",
        json={
            "workspace_id": str(uuid4()),
            "name": "Phase 1",
            "visibility": "public",
            "allow_anonymous_edit": True,
        },
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Phase 1"


def test_get_project_by_share_slug(client, app):
    service = StubProjectService()
    app.dependency_overrides[get_project_service] = lambda: service

    response = client.get("/api/v1/share/share-abc")

    assert response.status_code == 200
    assert response.json()["share_slug"] == "share-abc"


def test_list_projects(client, app):
    service = StubProjectService()
    app.dependency_overrides[get_project_service] = lambda: service

    response = client.get("/api/v1/projects")

    assert response.status_code == 200
    body = response.json()
    assert len(body) == 1
    assert body[0]["workspace_name"] == "Default Workspace"


def test_duplicate_project(client, app):
    service = StubProjectService()
    app.dependency_overrides[get_project_service] = lambda: service

    response = client.post(
        f"/api/v1/projects/{uuid4()}/duplicate",
        json={"name": "Copy of Project"},
    )

    assert response.status_code == 201
    assert response.json()["name"] == "Copy of Project"
