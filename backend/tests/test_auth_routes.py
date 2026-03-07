from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from app.core.security import (
    ACCESS_COOKIE_NAME,
    CSRF_COOKIE_NAME,
    OAUTH_STATE_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    encode_access_token,
)
from app.features.auth.routers import get_auth_service
from app.features.auth.services import IssuedAuthSession, OAuthCallbackResult, OAuthStartResult


def _build_user():
    now = datetime.now(UTC)
    return {
        "user_id": uuid4(),
        "email": "demo@example.com",
        "display_name": "Demo User",
        "status": "active",
        "primary_auth_provider": "email",
        "email_verified_at": now,
        "last_login_at": now,
        "created_at": now,
        "updated_at": now,
    }


def _build_auth_session() -> IssuedAuthSession:
    user = _build_user()
    session_id = uuid4()
    access_expires_at = datetime.now(UTC) + timedelta(minutes=15)
    refresh_expires_at = datetime.now(UTC) + timedelta(days=30)
    return IssuedAuthSession(
        user=user,
        session_id=session_id,
        access_token=encode_access_token(
            user_id=user["user_id"],
            session_id=session_id,
            expires_at=access_expires_at,
        ),
        refresh_token="refresh-token-value",
        csrf_token="csrf-token-value",
        access_token_expires_at=access_expires_at,
        refresh_token_expires_at=refresh_expires_at,
    )


class StubAuthService:
    def __init__(self) -> None:
        self.auth_session = _build_auth_session()
        self.logged_out = False

    def register_email(self, payload, ctx, *, user_agent, ip_addr):
        return self.auth_session

    def login_email(self, payload, ctx, *, user_agent, ip_addr):
        return self.auth_session

    def get_current_user(self, ctx):
        return self.auth_session.user

    def refresh_session(self, refresh_token, *, user_agent, ip_addr):
        return self.auth_session

    def logout(self, refresh_token):
        self.logged_out = True

    def start_oauth(self, provider, payload, *, backend_base_url, ip_addr):
        return OAuthStartResult(
            provider=provider,
            authorization_url="https://example.com/oauth/start",
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
            state_token="oauth-state-token",
        )

    def complete_oauth(
        self,
        provider,
        *,
        code,
        state_token,
        backend_base_url,
        user_agent,
        ip_addr,
    ):
        return OAuthCallbackResult(
            auth_session=self.auth_session,
            redirect_path="/auth/callback",
        )

    def claim_guest_workspace(self, payload, ctx):
        return {
            "workspace_id": payload.workspace_id,
            "owner_user_id": self.auth_session.user["user_id"],
            "claim_status": "claimed",
            "claimed_project_count": 1,
            "updated_at": datetime.now(UTC),
        }


def test_register_email_sets_auth_cookies(client, app):
    service = StubAuthService()
    app.dependency_overrides[get_auth_service] = lambda: service

    response = client.post(
        "/api/v1/auth/email/register",
        json={
            "email": "demo@example.com",
            "password": "StrongPass123",
            "display_name": "Demo User",
        },
    )

    assert response.status_code == 201
    assert response.json()["user"]["email"] == "demo@example.com"
    assert ACCESS_COOKIE_NAME in response.cookies
    assert REFRESH_COOKIE_NAME in response.cookies
    assert CSRF_COOKIE_NAME in response.cookies


def test_get_session_reads_cookie_backed_identity(client, app):
    service = StubAuthService()
    app.dependency_overrides[get_auth_service] = lambda: service
    client.cookies.set(ACCESS_COOKIE_NAME, service.auth_session.access_token)

    response = client.get("/api/v1/auth/session")

    assert response.status_code == 200
    assert response.json()["user"]["email"] == service.auth_session.user["email"]


def test_refresh_rotates_session_when_csrf_matches(client, app):
    service = StubAuthService()
    app.dependency_overrides[get_auth_service] = lambda: service
    client.cookies.set(REFRESH_COOKIE_NAME, "refresh-token-value")
    client.cookies.set(CSRF_COOKIE_NAME, "csrf-token-value")

    response = client.post(
        "/api/v1/auth/refresh",
        headers={"X-CSRF-Token": "csrf-token-value"},
    )

    assert response.status_code == 200
    assert response.cookies[ACCESS_COOKIE_NAME]
    assert response.cookies[REFRESH_COOKIE_NAME]


def test_logout_clears_cookies(client, app):
    service = StubAuthService()
    app.dependency_overrides[get_auth_service] = lambda: service
    client.cookies.set(REFRESH_COOKIE_NAME, "refresh-token-value")
    client.cookies.set(CSRF_COOKIE_NAME, "csrf-token-value")

    response = client.post(
        "/api/v1/auth/logout",
        headers={"X-CSRF-Token": "csrf-token-value"},
    )

    assert response.status_code == 200
    assert service.logged_out is True


def test_oauth_start_sets_state_cookie(client, app):
    service = StubAuthService()
    app.dependency_overrides[get_auth_service] = lambda: service

    response = client.post(
        "/api/v1/auth/oauth/google/start",
        json={"redirect_path": "/auth/callback"},
    )

    assert response.status_code == 200
    assert response.json()["authorization_url"] == "https://example.com/oauth/start"
    assert response.cookies[OAUTH_STATE_COOKIE_NAME] == "oauth-state-token"


def test_oauth_callback_redirects_to_frontend(client, app):
    service = StubAuthService()
    app.dependency_overrides[get_auth_service] = lambda: service
    client.cookies.set(OAUTH_STATE_COOKIE_NAME, "oauth-state-token")

    response = client.get(
        "/api/v1/auth/oauth/google/callback?code=demo-code&state=oauth-state-token",
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"] == "http://localhost:3000/auth/callback?provider=google"
    assert response.cookies[ACCESS_COOKIE_NAME]


def test_claim_guest_requires_csrf(client, app):
    service = StubAuthService()
    app.dependency_overrides[get_auth_service] = lambda: service
    client.cookies.set(ACCESS_COOKIE_NAME, service.auth_session.access_token)
    client.cookies.set(CSRF_COOKIE_NAME, "csrf-token-value")

    response = client.post(
        "/api/v1/auth/claim-guest",
        json={"workspace_id": str(uuid4())},
        headers={"X-CSRF-Token": "csrf-token-value"},
    )

    assert response.status_code == 200
    assert response.json()["claim_status"] == "claimed"
