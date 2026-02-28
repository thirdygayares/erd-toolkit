from __future__ import annotations

from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from app.core.config import get_settings
from app.core.context import RequestContext


class Database:
    def __init__(self, dsn: str) -> None:
        self._dsn = dsn

    @contextmanager
    def connection(self):
        conn = psycopg.connect(self._dsn, row_factory=dict_row)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    @staticmethod
    def apply_request_context(conn: psycopg.Connection, ctx: RequestContext) -> None:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT set_config('app.current_user_uuid', %s, true)",
                (str(ctx.current_user_id) if ctx.current_user_id else "",),
            )
            cur.execute(
                "SELECT set_config('app.project_share_slug', %s, true)",
                (ctx.share_slug or "",),
            )
            cur.execute(
                "SELECT set_config('app.request_mode', %s, true)",
                (ctx.request_mode,),
            )


_db_instance: Database | None = None


def get_db() -> Database:
    global _db_instance
    if _db_instance is None:
        settings = get_settings()
        _db_instance = Database(settings.database_dsn)
    return _db_instance
