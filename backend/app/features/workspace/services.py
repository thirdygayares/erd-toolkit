from __future__ import annotations

import re
from uuid import uuid4

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import ValidationError
from app.features.workspace import sql
from app.features.workspace.schemas import WorkspaceCreateRequest


class WorkspaceService:
    def __init__(self, db: Database) -> None:
        self.db = db

    def create_workspace(self, payload: WorkspaceCreateRequest, ctx: RequestContext) -> dict:
        slug = payload.slug or self._build_slug(payload.name)
        owner_user_id = str(ctx.current_user_id) if ctx.current_user_id else None

        if owner_user_id is None and payload.workspace_mode != "guest":
            raise ValidationError("anonymous requests can only create guest workspace")

        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(
                    sql.INSERT_WORKSPACE,
                    {
                        "name": payload.name,
                        "slug": slug,
                        "owner_user_id": owner_user_id,
                        "workspace_mode": payload.workspace_mode,
                        "actor_id": owner_user_id,
                    },
                )
                return cur.fetchone()

    def list_workspaces(self, ctx: RequestContext) -> list[dict]:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.LIST_WORKSPACES)
                return cur.fetchall()

    def ensure_default_workspace(self, ctx: RequestContext) -> dict:
        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.ENSURE_DEFAULT_WORKSPACE)
                return cur.fetchone()

    @staticmethod
    def _build_slug(name: str) -> str:
        cleaned = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
        if not cleaned:
            cleaned = "workspace"
        return f"{cleaned}-{uuid4().hex[:8]}"
