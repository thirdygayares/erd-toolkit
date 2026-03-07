from __future__ import annotations

import ipaddress
from urllib.parse import urlencode, urljoin

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.context import RequestContext, get_request_context
from app.core.db import get_db
from app.core.errors import AppError, ForbiddenError, ValidationError
from app.core.security import (
    ACCESS_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    OAUTH_STATE_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
)
from app.features.auth.schemas import (
    AuthSessionResponse,
    AuthStatusResponse,
    AuthUserResponse,
    EmailLoginRequest,
    EmailRegisterRequest,
    GuestClaimRequest,
    GuestClaimResponse,
    LogoutResponse,
    OAuthStartRequest,
    OAuthStartResponse,
)
from app.features.auth.services import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


def get_auth_service() -> AuthService:
    return AuthService(get_db())


@router.post(
    "/email/register",
    response_model=AuthSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_email(
    payload: EmailRegisterRequest,
    request: Request,
    response: Response,
    ctx: RequestContext = Depends(get_request_context),
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    auth_session = service.register_email(
        payload,
        ctx,
        user_agent=request.headers.get("user-agent"),
        ip_addr=_get_client_ip(request),
    )
    _set_auth_cookies(response, auth_session)
    return AuthSessionResponse(**auth_session.response_body())


@router.post("/email/login", response_model=AuthSessionResponse)
def login_email(
    payload: EmailLoginRequest,
    request: Request,
    response: Response,
    ctx: RequestContext = Depends(get_request_context),
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    auth_session = service.login_email(
        payload,
        ctx,
        user_agent=request.headers.get("user-agent"),
        ip_addr=_get_client_ip(request),
    )
    _set_auth_cookies(response, auth_session)
    return AuthSessionResponse(**auth_session.response_body())


@router.get("/session", response_model=AuthStatusResponse)
def get_session(
    ctx: RequestContext = Depends(get_request_context),
    service: AuthService = Depends(get_auth_service),
) -> AuthStatusResponse:
    user = service.get_current_user(ctx)
    return AuthStatusResponse(user=AuthUserResponse(**user))


@router.post("/refresh", response_model=AuthSessionResponse)
def refresh_session(
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> AuthSessionResponse:
    _require_csrf(request)
    auth_session = service.refresh_session(
        request.cookies.get(REFRESH_COOKIE_NAME),
        user_agent=request.headers.get("user-agent"),
        ip_addr=_get_client_ip(request),
    )
    _set_auth_cookies(response, auth_session)
    return AuthSessionResponse(**auth_session.response_body())


@router.post("/logout", response_model=LogoutResponse)
def logout(
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> LogoutResponse:
    _require_csrf(request)
    service.logout(request.cookies.get(REFRESH_COOKIE_NAME))
    _clear_auth_cookies(response)
    return LogoutResponse(detail="logged out")


@router.post("/oauth/{provider}/start", response_model=OAuthStartResponse)
def start_oauth(
    provider: str,
    payload: OAuthStartRequest,
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> OAuthStartResponse:
    result = service.start_oauth(
        provider,
        payload,
        backend_base_url=str(request.base_url).rstrip("/"),
        ip_addr=_get_client_ip(request),
    )
    response.set_cookie(
        key=OAUTH_STATE_COOKIE_NAME,
        value=result.state_token,
        max_age=get_settings().auth_oauth_state_ttl_minutes * 60,
        secure=get_settings().auth_cookie_secure,
        httponly=True,
        samesite=get_settings().auth_cookie_samesite,
        domain=get_settings().auth_cookie_domain,
        path="/",
    )
    return OAuthStartResponse(
        provider=result.provider,
        authorization_url=result.authorization_url,
        expires_at=result.expires_at,
    )


@router.get("/oauth/{provider}/callback")
def oauth_callback(
    provider: str,
    request: Request,
    code: str = Query(...),
    state: str = Query(...),
    service: AuthService = Depends(get_auth_service),
):
    settings = get_settings()
    frontend_error_url = _frontend_redirect_url(
        settings.auth_frontend_base_url,
        "/auth/login",
        {"error": "oauth_failed", "provider": provider},
    )

    if request.cookies.get(OAUTH_STATE_COOKIE_NAME) != state:
        response = RedirectResponse(frontend_error_url, status_code=status.HTTP_302_FOUND)
        response.delete_cookie(
            OAUTH_STATE_COOKIE_NAME,
            domain=settings.auth_cookie_domain,
            path="/",
        )
        return response

    try:
        result = service.complete_oauth(
            provider,
            code=code,
            state_token=state,
            backend_base_url=str(request.base_url).rstrip("/"),
            user_agent=request.headers.get("user-agent"),
            ip_addr=_get_client_ip(request),
        )
    except AppError:
        response = RedirectResponse(frontend_error_url, status_code=status.HTTP_302_FOUND)
        response.delete_cookie(
            OAUTH_STATE_COOKIE_NAME,
            domain=settings.auth_cookie_domain,
            path="/",
        )
        return response

    redirect_url = _frontend_redirect_url(
        settings.auth_frontend_base_url,
        result.redirect_path,
        {"provider": provider},
    )
    response = RedirectResponse(redirect_url, status_code=status.HTTP_302_FOUND)
    _set_auth_cookies(response, result.auth_session)
    response.delete_cookie(
        OAUTH_STATE_COOKIE_NAME,
        domain=settings.auth_cookie_domain,
        path="/",
    )
    return response


@router.post("/claim-guest", response_model=GuestClaimResponse)
def claim_guest_workspace(
    payload: GuestClaimRequest,
    request: Request,
    ctx: RequestContext = Depends(get_request_context),
    service: AuthService = Depends(get_auth_service),
) -> GuestClaimResponse:
    _require_csrf(request)
    claim_row = service.claim_guest_workspace(payload, ctx)
    return GuestClaimResponse(**claim_row)


def _set_auth_cookies(response: Response, auth_session) -> None:
    settings = get_settings()
    access_max_age = settings.auth_access_ttl_minutes * 60
    refresh_max_age = settings.auth_refresh_ttl_days * 24 * 60 * 60

    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=auth_session.access_token,
        max_age=access_max_age,
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
        domain=settings.auth_cookie_domain,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=auth_session.refresh_token,
        max_age=refresh_max_age,
        secure=settings.auth_cookie_secure,
        httponly=True,
        samesite=settings.auth_cookie_samesite,
        domain=settings.auth_cookie_domain,
        path="/",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=auth_session.csrf_token,
        max_age=refresh_max_age,
        secure=settings.auth_cookie_secure,
        httponly=False,
        samesite=settings.auth_cookie_samesite,
        domain=settings.auth_cookie_domain,
        path="/",
    )


def _clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    for cookie_name in (ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, CSRF_COOKIE_NAME):
        response.delete_cookie(
            cookie_name,
            domain=settings.auth_cookie_domain,
            path="/",
        )


def _require_csrf(request: Request) -> None:
    cookie_token = request.cookies.get(CSRF_COOKIE_NAME)
    header_token = request.headers.get("X-CSRF-Token")

    if not cookie_token or not header_token or cookie_token != header_token:
        raise ForbiddenError("csrf token mismatch")


def _get_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return _normalize_ip_address(forwarded_for.split(",")[0].strip())
    if request.client:
        return _normalize_ip_address(request.client.host)
    return None


def _frontend_redirect_url(base_url: str, path: str, query: dict[str, str]) -> str:
    safe_path = path if path.startswith("/") else f"/{path}"
    if not safe_path.startswith("/auth/") and not safe_path.startswith("/project/") and safe_path != "/":
        raise ValidationError("invalid redirect path")
    redirect_url = urljoin(f"{base_url.rstrip('/')}/", safe_path.lstrip("/"))
    if query:
        redirect_url = f"{redirect_url}?{urlencode(query)}"
    return redirect_url


def _normalize_ip_address(candidate: str | None) -> str | None:
    if not candidate:
        return None
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return None
