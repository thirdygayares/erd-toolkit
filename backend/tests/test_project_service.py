from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from uuid import uuid4

from psycopg.errors import UniqueViolation

from app.core.errors import ConflictError
from app.features.project.services import ProjectService


class _FakeCursor:
    def __init__(self):
        self.calls: list[tuple[str, dict | tuple | None]] = []
        self._row: dict | None = None

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def execute(self, query: str, params: dict | tuple | None = None):
        self.calls.append((query, params))
        if "fn_project_duplicate" in query:
            self._row = {
                "project_id": uuid4(),
                "workspace_id": uuid4(),
                "owner_user_id": uuid4(),
                "name": "Copy of ERD",
                "description": None,
                "visibility": "private",
                "share_slug": "copy-share",
                "allow_anonymous_edit": False,
                "is_archived": False,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
            }
        else:
            self._row = None

    def fetchone(self):
        return self._row


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


class _FakeContext:
    current_user_id = None
    share_slug = None
    request_mode = "authenticated"


def test_duplicate_project_uses_database_contract():
    cursor = _FakeCursor()
    db = _FakeDatabase(cursor)
    service = ProjectService(db)
    project_id = str(uuid4())

    result = service.duplicate_project(project_id, "Copy of ERD", ctx=_FakeContext())

    assert result["name"] == "Copy of ERD"
    assert len(cursor.calls) == 1
    query, params = cursor.calls[0]
    assert "api.fn_project_duplicate" in query
    assert params == {
        "project_id": project_id,
        "name": "Copy of ERD",
    }


class _UniqueViolationCursor(_FakeCursor):
    def execute(self, query: str, params: dict | tuple | None = None):
        self.calls.append((query, params))
        raise UniqueViolation(
            'duplicate key value violates unique constraint "project_workspace_name_unq"'
        )


def test_duplicate_project_translates_workspace_name_conflict():
    cursor = _UniqueViolationCursor()
    db = _FakeDatabase(cursor)
    service = ProjectService(db)

    try:
        service.duplicate_project(str(uuid4()), "Copy of ERD", ctx=_FakeContext())
    except ConflictError as exc:
        assert str(exc) == "A project with that name already exists in this workspace."
    else:
        raise AssertionError("expected ConflictError for duplicate project name")
