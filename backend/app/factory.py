from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from psycopg.errors import InsufficientPrivilege

from app.core.config import get_settings
from app.core.errors import AppError
from api import register_routers


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name)
    origins = settings.cors_origin_list or ["http://localhost:3000", "http://localhost:3001"]
    allow_all_origins = "*" in origins

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"] if allow_all_origins else origins,
        allow_credentials=settings.cors_allow_credentials and not allow_all_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/healthz")
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.message})

    @app.exception_handler(InsufficientPrivilege)
    async def insufficient_privilege_handler(
        _: Request,
        exc: InsufficientPrivilege,
    ) -> JSONResponse:
        detail = (str(exc).strip().splitlines() or ["forbidden"])[0]
        return JSONResponse(status_code=403, content={"detail": detail})

    register_routers(app)
    return app
