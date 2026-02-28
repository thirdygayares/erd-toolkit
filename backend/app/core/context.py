from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated
from uuid import UUID

from fastapi import Header


@dataclass(frozen=True)
class RequestContext:
    current_user_id: UUID | None
    share_slug: str | None
    request_mode: str


def get_request_context(
    x_user_id: Annotated[str | None, Header(alias="X-User-Id")] = None,
    x_share_slug: Annotated[str | None, Header(alias="X-Share-Slug")] = None,
) -> RequestContext:
    user_uuid: UUID | None = None
    if x_user_id:
        user_uuid = UUID(x_user_id)

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
