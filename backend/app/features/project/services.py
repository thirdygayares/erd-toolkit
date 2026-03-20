from __future__ import annotations

from psycopg.errors import UndefinedFunction

from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import NotFoundError
from app.features.project import sql
from app.features.project.schemas import ProjectCreateRequest, ProjectVisibilityUpdateRequest
from app.features.schema_editor import sql as schema_sql


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

    def duplicate_project(self, project_id: str, new_name: str, ctx: RequestContext) -> dict:
        from app.features.diagram.schemas import DiagramCreateRequest
        from app.features.diagram.services import DiagramService

        diagram_service = DiagramService(self.db)

        # 1. Fetch original project
        old_project = self.get_project(project_id, ctx)

        # 2. Create new project
        new_project = self.create_project(
            ProjectCreateRequest(
                workspace_id=old_project["workspace_id"],
                name=new_name,
                visibility=old_project["visibility"],
                description=old_project["description"],
                allow_anonymous_edit=old_project["allow_anonymous_edit"],
            ),
            ctx
        )

        # 3. Handle diagram cloning if it exists
        old_diagrams = diagram_service.list_diagrams_by_workspace(str(old_project["workspace_id"]), ctx)
        old_diagram = next((d for d in old_diagrams if str(d["project_id"]) == project_id), None)

        if old_diagram:
            new_diagram = diagram_service.create_diagram(
                DiagramCreateRequest(
                    workspace_id=new_project["workspace_id"],
                    project_id=new_project["project_id"],
                    name=new_name,
                    description=old_diagram["description"]
                ),
                ctx
            )
            
            full_old = diagram_service.get_diagram_detail(str(old_diagram["diagram_id"]), ctx)
            table_map = {}
            column_map = {}

            with self.db.connection() as conn:
                self.db.apply_request_context(conn, ctx)
                with conn.cursor() as cur:
                    # Clone Tables and Columns
                    for t in full_old["tables"]:
                        cur.execute(
                            schema_sql.INSERT_TABLE,
                            {
                                "diagram_id": new_diagram["diagram_id"],
                                "schema_name": t["schema_name"],
                                "table_name": t["table_name"],
                                "display_name": t["display_name"],
                                "pos_x": t["pos_x"],
                                "pos_y": t["pos_y"],
                                "color_hex": t["color_hex"],
                            },
                        )
                        new_t = cur.fetchone()
                        if new_t:
                            table_map[str(t["table_id"])] = str(new_t["table_id"])
                            for c in t["columns"]:
                                params = {
                                    "table_id": new_t["table_id"],
                                    "column_name": c["column_name"],
                                    "ordinal_position": c["ordinal_position"],
                                    "data_type": c["data_type"],
                                    "udt_name": c["udt_name"],
                                    "is_nullable": c["is_nullable"],
                                    "default_sql": c["default_sql"],
                                    "is_primary_key": c["is_primary_key"],
                                    "is_unique": c["is_unique"],
                                    "example_value": c.get("example_value"),
                                }
                                try:
                                    cur.execute(schema_sql.INSERT_COLUMN, params)
                                except UndefinedFunction:
                                    cur.execute(schema_sql.INSERT_COLUMN_LEGACY, params)

                                new_c = cur.fetchone()
                                if new_c:
                                    column_map[str(c["column_id"])] = str(new_c["column_id"])

                    # Clone Relationships
                    for r in full_old["relationships"]:
                        if str(r["from_table_id"]) in table_map and str(r["from_column_id"]) in column_map and str(r["to_table_id"]) in table_map and str(r["to_column_id"]) in column_map:
                            cur.execute(
                                schema_sql.INSERT_RELATIONSHIP,
                                {
                                    "diagram_id": new_diagram["diagram_id"],
                                    "name": r["name"],
                                    "from_table_id": table_map[str(r["from_table_id"])],
                                    "from_column_id": column_map[str(r["from_column_id"])],
                                    "to_table_id": table_map[str(r["to_table_id"])],
                                    "to_column_id": column_map[str(r["to_column_id"])],
                                    "cardinality_from": r["cardinality_from"],
                                    "cardinality_to": r["cardinality_to"],
                                    "on_update_action": r["on_update_action"],
                                    "on_delete_action": r["on_delete_action"],
                                    "is_identifying": False,
                                },
                            )

        return self.get_project(str(new_project["project_id"]), ctx)
