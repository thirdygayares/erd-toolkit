from __future__ import annotations

from fastapi import APIRouter, FastAPI

import app.features.auth.routers as auth_router
import app.features.diagram.routers as diagram_router
import app.features.export.routers as export_router
import app.features.introspection.routers as introspection_router
import app.features.project.routers as project_router
import app.features.schema_editor.routers as schema_editor_router
import app.features.workspace.routers as workspace_router

api_v1 = APIRouter(prefix="/api/v1")


def register_routers(app: FastAPI) -> None:
    """Register all feature routes with the FastAPI app."""
    api_v1.include_router(auth_router.router)
    api_v1.include_router(workspace_router.router)
    api_v1.include_router(project_router.router)
    api_v1.include_router(diagram_router.router)
    api_v1.include_router(schema_editor_router.router)
    api_v1.include_router(introspection_router.router)
    api_v1.include_router(export_router.router)
    app.include_router(api_v1)
