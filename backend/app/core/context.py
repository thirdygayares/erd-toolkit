from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Header, Request

from app.core.errors import UnauthorizedError
from app.core.security import ACCESS_COOKIE_NAME, decode_access_token


@dataclass(frozen=True)
class RequestContext:
    current_user_id: UUID | None
    share_slug: str | None
    request_mode: str


def get_request_context(
    request: Request,
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    x_share_slug: Annotated[str | None, Header(alias="X-Share-Slug")] = None,
) -> RequestContext:
    user_uuid: UUID | None = None

    access_token = request.cookies.get(ACCESS_COOKIE_NAME)
    if access_token:
        try:
            payload = decode_access_token(access_token)
        except UnauthorizedError:
            payload = None
        if payload is not None:
            user_uuid = payload.user_id

    if user_uuid is None and x_user_id:
        try:
            user_uuid = UUID(x_user_id)
        except ValueError:
            user_uuid = None

    if user_uuid:
        mode = "authenticated"
    elif x_share_slug:
        mode = "anonymous"
    else:
        mode = "anonymous"

    return RequestContext(
        current_user_id=user_uuid,
        share_slug=x_share_slug,
        request_mode=mode,
    )
