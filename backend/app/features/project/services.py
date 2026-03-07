from __future__ import annotations

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import NotFoundError
from app.features.project import sql
from app.features.project.schemas import ProjectCreateRequest, ProjectVisibilityUpdateRequest


class ProjectService:
    def __init__(self, db: Database) -> None:
        self.db = db

    def create_project(self, payload: ProjectCreateRequest, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.CREATE_PROJECT,
                    {
                        "workspace_id": str(payload.workspace_id),
                        "name": payload.name,
                        "visibility": payload.visibility,
                        "description": payload.description,
                        "allow_anonymous_edit": payload.allow_anonymous_edit,
                        "share_slug": payload.share_slug,
                    },
                )
                row = cur.fetchone()
                if not row or row.get("project_id") is None:
                    raise NotFoundError("unable to create project")
                return row

    def get_project_by_share_slug(self, share_slug: str, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(
                conn,
                RequestContext(
                    current_user_id=ctx.current_user_id,
                    share_slug=share_slug,
                    request_mode=ctx.request_mode,
                ),
            )
            with conn.cursor() as cur:
                cur.execute(sql.GET_PROJECT_BY_SHARE, {"share_slug": share_slug})
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("project not found")
                return row

    def set_visibility(
        self,
        project_id: str,
        payload: ProjectVisibilityUpdateRequest,
        ctx: RequestContext,
    ) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.SET_PROJECT_VISIBILITY,
                    {
                        "project_id": project_id,
                        "visibility": payload.visibility,
                        "allow_anonymous_edit": payload.allow_anonymous_edit,
                    },
                )
                row = cur.fetchone()
                if not row or row.get("project_id") is None:
                    raise NotFoundError("project not found or not editable")
                return row

    def get_project(self, project_id: str, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.GET_PROJECT_BY_ID, {"project_id": project_id})
                row = cur.fetchone()
                if not row:
                    raise NotFoundError("project not found")
                return row

    def list_projects(self, ctx: RequestContext) -> list[dict]:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.LIST_PROJECTS)
                return cur.fetchall()
