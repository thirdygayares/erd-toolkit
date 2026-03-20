from __future__ import annotations

from contextlib import contextmanager
from uuid import uuid4

from app.core.context import RequestContext
from app.features.diagram import services as diagram_services
from app.features.project.services import ProjectService


class _FakeCursor:
    def __init__(self):
        self.calls: list[tuple[str, dict | tuple | None]] = []
        self._next_row: dict | None = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query: str, params: dict | tuple | None = None):
        self.calls.append((query, params))
        if "fn_table_create" in query:
            self._next_row = {"table_id": uuid4()}
        elif "fn_column_create" in query:
            self._next_row = {"column_id": uuid4()}
        elif "fn_relationship_create" in query:
            self._next_row = {"relationship_id": uuid4()}
        else:
            self._next_row = None

    def fetchone(self):
        return self._next_row


class _FakeConnection:
    def __init__(self, cursor: _FakeCursor):
        self._cursor = cursor

    def cursor(self):
        return self._cursor


class _FakeDatabase:
    def __init__(self, cursor: _FakeCursor):
        self._cursor = cursor

    @contextmanager
    def connection(self):
        yield _FakeConnection(self._cursor)

    def apply_request_context(self, conn, ctx):
        return None


class _StubDiagramService:
    def __init__(self, db):
        self.db = db

    def list_diagrams_by_workspace(self, workspace_id, ctx):
        return [
            {
                "diagram_id": ORIGINAL_DIAGRAM_ID,
                "workspace_id": ORIGINAL_WORKSPACE_ID,
                "project_id": ORIGINAL_PROJECT_ID,
                "name": "Original Diagram",
                "description": "legacy",
                "version_no": 1,
                "viewport_x": 0,
                "viewport_y": 0,
                "viewport_zoom": 1,
                "created_at": None,
                "updated_at": None,
            }
        ]

    def create_diagram(self, payload, ctx):
        return {
            "diagram_id": NEW_DIAGRAM_ID,
            "workspace_id": payload.workspace_id,
            "project_id": payload.project_id,
            "name": payload.name,
            "description": payload.description,
            "version_no": 1,
            "viewport_x": 0,
            "viewport_y": 0,
            "viewport_zoom": 1,
            "created_at": None,
            "updated_at": None,
        }

    def get_diagram_detail(self, diagram_id, ctx):
        return {
            "diagram": {
                "diagram_id": diagram_id,
                "workspace_id": ORIGINAL_WORKSPACE_ID,
                "project_id": ORIGINAL_PROJECT_ID,
                "name": "Original Diagram",
                "description": "legacy",
                "version_no": 1,
                "viewport_x": 0,
                "viewport_y": 0,
                "viewport_zoom": 1,
                "created_at": None,
                "updated_at": None,
            },
            "tables": [
                {
                    "table_id": ORIGINAL_TABLE_ID,
                    "diagram_id": diagram_id,
                    "schema_name": "public",
                    "table_name": "users",
                    "display_name": "Users",
                    "pos_x": 12,
                    "pos_y": 24,
                    "color_hex": "#00aaff",
                    "columns": [
                        {
                            "column_id": ORIGINAL_COLUMN_ID,
                            "table_id": ORIGINAL_TABLE_ID,
                            "column_name": "nickname",
                            "ordinal_position": 1,
                            "data_type": "text",
                            "udt_name": "text",
                            "is_nullable": True,
                            "default_sql": None,
                            "is_primary_key": False,
                            "is_unique": False,
                            "example_value": "nickname@example.com",
                        }
                    ],
                }
            ],
            "relationships": [],
        }


ORIGINAL_PROJECT_ID = uuid4()
ORIGINAL_WORKSPACE_ID = uuid4()
ORIGINAL_DIAGRAM_ID = uuid4()
NEW_PROJECT_ID = uuid4()
NEW_DIAGRAM_ID = uuid4()
ORIGINAL_TABLE_ID = uuid4()
ORIGINAL_COLUMN_ID = uuid4()


class _DuplicateProjectService(ProjectService):
    def __init__(self, db):
        super().__init__(db)
        self._created_project: dict | None = None

    def get_project(self, project_id: str, ctx: RequestContext) -> dict:
        if project_id == str(ORIGINAL_PROJECT_ID):
            return {
                "project_id": ORIGINAL_PROJECT_ID,
                "workspace_id": ORIGINAL_WORKSPACE_ID,
                "owner_user_id": None,
                "name": "Original Project",
                "description": "legacy",
                "visibility": "public",
                "share_slug": None,
                "allow_anonymous_edit": True,
                "is_archived": False,
                "created_at": None,
                "updated_at": None,
            }
        if self._created_project and project_id == str(self._created_project["project_id"]):
            return self._created_project
        raise AssertionError(f"unexpected project lookup: {project_id}")

    def create_project(self, payload, ctx):
        self._created_project = {
            "project_id": NEW_PROJECT_ID,
            "workspace_id": payload.workspace_id,
            "owner_user_id": None,
            "name": payload.name,
            "description": payload.description,
            "visibility": payload.visibility,
            "share_slug": payload.share_slug,
            "allow_anonymous_edit": payload.allow_anonymous_edit,
            "is_archived": False,
            "created_at": None,
            "updated_at": None,
        }
        return self._created_project


def test_duplicate_project_copies_column_example_value(monkeypatch):
    cursor = _FakeCursor()
    db = _FakeDatabase(cursor)
    service = _DuplicateProjectService(db)

    monkeypatch.setattr(diagram_services, "DiagramService", _StubDiagramService)

    result = service.duplicate_project(str(ORIGINAL_PROJECT_ID), "Copy of Original Project", RequestContext(
        current_user_id=None,
        share_slug=None,
        request_mode="authenticated",
    ))

    assert result["project_id"] == NEW_PROJECT_ID
    column_calls = [params for query, params in cursor.calls if "fn_column_create" in query]
    assert len(column_calls) == 1
    assert column_calls[0]["example_value"] == "nickname@example.com"
