from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import urlencode
from uuid import UUID

import httpx
from psycopg.errors import UniqueViolation

from app.core.config import Settings, get_settings
from app.core.context import RequestContext
from app.core.db import Database
from app.core.errors import ConflictError, RateLimitError, UnauthorizedError, ValidationError
from app.core.security import (
    build_pkce_code_challenge,
    encode_access_token,
    generate_csrf_token,
    generate_pkce_verifier,
    generate_refresh_token,
    generate_state_token,
    get_rate_limiter,
    hash_password,
    hash_token,
    validate_password_policy,
    verify_password,
)
from app.features.auth import sql
from app.features.auth.schemas import (
    EmailLoginRequest,
    EmailRegisterRequest,
    GuestClaimRequest,
    OAuthStartRequest,
)


@dataclass(frozen=True)
class IssuedAuthSession:
    user: dict[str, Any]
    session_id: UUID
    access_token: str
    refresh_token: str
    csrf_token: str
    access_token_expires_at: datetime
    refresh_token_expires_at: datetime

    def response_body(self) -> dict[str, Any]:
        return {
            "user": self.user,
            "session_id": self.session_id,
            "access_token_expires_at": self.access_token_expires_at,
            "refresh_token_expires_at": self.refresh_token_expires_at,
        }


@dataclass(frozen=True)
class OAuthStartResult:
    provider: str
    authorization_url: str
    expires_at: datetime
    state_token: str


@dataclass(frozen=True)
class OAuthCallbackResult:
    auth_session: IssuedAuthSession
    redirect_path: str


class AuthService:
    def __init__(
        self,
        db: Database,
        settings: Settings | None = None,
        http_client: httpx.Client | None = None,
    ) -> None:
        self.db = db
        self.settings = settings or get_settings()
        self.http_client = http_client or httpx.Client(timeout=20)
        self.rate_limiter = get_rate_limiter()

    def register_email(
        self,
        payload: EmailRegisterRequest,
        ctx: RequestContext,
        *,
        user_agent: str | None,
        ip_addr: str | None,
    ) -> IssuedAuthSession:
        self._check_auth_rate_limit("register", payload.email, ip_addr)
        self._validate_email(payload.email)
        validate_password_policy(payload.password)
        password_hash = hash_password(payload.password)
        email_verified_at = datetime.now(UTC) if not self.settings.auth_email_verification_required else None

        try:
            with self.db.connection() as conn:
                self.db.apply_request_context(conn, ctx)
                with conn.cursor() as cur:
                    cur.execute(
                        sql.REGISTER_EMAIL,
                        {
                            "email": payload.email,
                            "password_hash": password_hash,
                            "display_name": payload.display_name,
                            "email_verified_at": email_verified_at,
                        },
                    )
                    user_row = cur.fetchone()
                    if not user_row:
                        raise ValidationError("unable to create account")

                    cur.execute(
                        sql.FINALIZE_LOGIN,
                        {
                            "user_id": str(user_row["user_id"]),
                            "provider": "email",
                            "event_metadata": json.dumps({"source": "register"}),
                        },
                    )
                    finalized_user = cur.fetchone()
                    if not finalized_user:
                        raise ValidationError("unable to finalize account session")

                    return self._issue_session(
                        cur,
                        finalized_user,
                        user_agent=user_agent,
                        ip_addr=ip_addr,
                    )
        except UniqueViolation as exc:
            raise ConflictError("email is already registered") from exc

    def login_email(
        self,
        payload: EmailLoginRequest,
        ctx: RequestContext,
        *,
        user_agent: str | None,
        ip_addr: str | None,
    ) -> IssuedAuthSession:
        self._check_auth_rate_limit("login", payload.email, ip_addr)
        self._validate_email(payload.email)

        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.LOGIN_EMAIL, {"email": payload.email})
                user_row = cur.fetchone()

                if not user_row or not user_row.get("password_hash"):
                    raise UnauthorizedError("invalid email or password")

                if user_row["status"] != "active":
                    raise UnauthorizedError("account is not available")

                locked_until = user_row.get("locked_until")
                if locked_until and locked_until > datetime.now(UTC):
                    raise RateLimitError("account is temporarily locked")

                if not verify_password(payload.password, str(user_row["password_hash"])):
                    self._record_failed_login(cur, user_row)
                    raise UnauthorizedError("invalid email or password")

                cur.execute(
                    sql.FINALIZE_LOGIN,
                    {
                        "user_id": str(user_row["user_id"]),
                        "provider": "email",
                        "event_metadata": json.dumps({"source": "email-login"}),
                    },
                )
                finalized_user = cur.fetchone()
                if not finalized_user:
                    raise UnauthorizedError("invalid email or password")

                return self._issue_session(
                    cur,
                    finalized_user,
                    user_agent=user_agent,
                    ip_addr=ip_addr,
                )

    def get_current_user(self, ctx: RequestContext) -> dict[str, Any]:
        if ctx.current_user_id is None:
            raise UnauthorizedError("authentication required")

        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                cur.execute(sql.GET_CURRENT_USER)
                user_row = cur.fetchone()
                if not user_row:
                    raise UnauthorizedError("authentication required")
                return user_row

    def refresh_session(
        self,
        refresh_token: str | None,
        *,
        user_agent: str | None,
        ip_addr: str | None,
    ) -> IssuedAuthSession:
        if not refresh_token:
            raise UnauthorizedError("refresh token is required")

        refresh_token_hash = hash_token(refresh_token)

        with self.db.connection() as conn:
            with conn.cursor() as cur:
                new_refresh_token = generate_refresh_token()
                new_refresh_token_hash = hash_token(new_refresh_token)
                refresh_expires_at = datetime.now(UTC) + timedelta(
                    days=self.settings.auth_refresh_ttl_days,
                )

                cur.execute(
                    sql.ROTATE_SESSION,
                    {
                        "current_refresh_token_hash": refresh_token_hash,
                        "new_refresh_token_hash": new_refresh_token_hash,
                        "expires_at": refresh_expires_at,
                        "user_agent": user_agent,
                        "ip_addr": ip_addr,
                    },
                )
                session_row = cur.fetchone()
                if not session_row:
                    raise UnauthorizedError("refresh token is invalid or expired")

                cur.execute(sql.GET_USER, {"user_id": str(session_row["user_id"])})
                user_row = cur.fetchone()
                if not user_row:
                    raise UnauthorizedError("refresh token is invalid or expired")

                return self._build_auth_session(
                    user_row=user_row,
                    session_id=UUID(str(session_row["session_id"])),
                    refresh_token=new_refresh_token,
                    refresh_token_expires_at=refresh_expires_at,
                )

    def logout(self, refresh_token: str | None) -> None:
        if not refresh_token:
            return

        with self.db.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql.REVOKE_SESSION,
                    {"refresh_token_hash": hash_token(refresh_token)},
                )
                cur.fetchone()

    def start_oauth(
        self,
        provider: str,
        payload: OAuthStartRequest,
        *,
        backend_base_url: str,
        ip_addr: str | None,
    ) -> OAuthStartResult:
        normalized_provider = self._normalize_provider(provider)
        self._check_auth_rate_limit(f"oauth:{normalized_provider}", normalized_provider, ip_addr)
        self._ensure_oauth_is_configured(normalized_provider)
        state_token = generate_state_token()
        expires_at = datetime.now(UTC) + timedelta(
            minutes=self.settings.auth_oauth_state_ttl_minutes,
        )
        code_verifier = generate_pkce_verifier() if normalized_provider == "google" else None
        redirect_uri = self._build_oauth_redirect_uri(normalized_provider, backend_base_url)

        with self.db.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql.CREATE_OAUTH_TRANSACTION,
                    {
                        "provider": normalized_provider,
                        "state_token": state_token,
                        "code_verifier": code_verifier,
                        "redirect_path": payload.redirect_path,
                        "guest_workspace_id": (
                            str(payload.guest_workspace_id)
                            if payload.guest_workspace_id
                            else None
                        ),
                        "guest_project_id": (
                            str(payload.guest_project_id) if payload.guest_project_id else None
                        ),
                        "expires_at": expires_at,
                    },
                )
                cur.fetchone()

        authorization_url = self._build_provider_authorization_url(
            provider=normalized_provider,
            state_token=state_token,
            redirect_uri=redirect_uri,
            code_verifier=code_verifier,
        )

        return OAuthStartResult(
            provider=normalized_provider,
            authorization_url=authorization_url,
            expires_at=expires_at,
            state_token=state_token,
        )

    def complete_oauth(
        self,
        provider: str,
        *,
        code: str,
        state_token: str,
        backend_base_url: str,
        user_agent: str | None,
        ip_addr: str | None,
    ) -> OAuthCallbackResult:
        normalized_provider = self._normalize_provider(provider)
        redirect_uri = self._build_oauth_redirect_uri(normalized_provider, backend_base_url)

        with self.db.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    sql.CONSUME_OAUTH_TRANSACTION,
                    {
                        "provider": normalized_provider,
                        "state_token": state_token,
                    },
                )
                transaction = cur.fetchone()
                if not transaction:
                    raise ValidationError("oauth state is invalid or expired")

                try:
                    profile = self._resolve_oauth_profile(
                        provider=normalized_provider,
                        code=code,
                        redirect_uri=redirect_uri,
                        code_verifier=transaction.get("code_verifier"),
                    )
                except httpx.HTTPError as exc:
                    raise ValidationError("oauth provider request failed") from exc

                cur.execute(
                    sql.UPSERT_OAUTH_USER,
                    {
                        "provider": normalized_provider,
                        "provider_subject": profile["provider_subject"],
                        "provider_email": profile["email"],
                        "display_name": profile.get("display_name"),
                        "is_email_verified": profile["is_email_verified"],
                    },
                )
                user_row = cur.fetchone()
                if not user_row:
                    raise ValidationError("unable to resolve oauth user")

                cur.execute(
                    sql.FINALIZE_LOGIN,
                    {
                        "user_id": str(user_row["user_id"]),
                        "provider": normalized_provider,
                        "event_metadata": json.dumps(
                            {"source": "oauth", "provider_subject": profile["provider_subject"]},
                        ),
                    },
                )
                finalized_user = cur.fetchone()
                if not finalized_user:
                    raise ValidationError("unable to finalize oauth login")

                auth_session = self._issue_session(
                    cur,
                    finalized_user,
                    user_agent=user_agent,
                    ip_addr=ip_addr,
                )

        redirect_path = transaction.get("redirect_path") or "/auth/callback"
        return OAuthCallbackResult(auth_session=auth_session, redirect_path=str(redirect_path))

    def claim_guest_workspace(
        self,
        payload: GuestClaimRequest,
        ctx: RequestContext,
    ) -> dict[str, Any]:
        if ctx.current_user_id is None:
            raise UnauthorizedError("authentication required")

        with self.db.connection() as conn:
            self.db.apply_request_context(conn, ctx)
            with conn.cursor() as cur:
                try:
                    cur.execute(
                        sql.CLAIM_GUEST_WORKSPACE,
                        {
                            "user_id": str(ctx.current_user_id),
                            "workspace_id": str(payload.workspace_id),
                        },
                    )
                    claim_row = cur.fetchone()
                except UniqueViolation as exc:
                    raise ConflictError("workspace has already been claimed") from exc

                if not claim_row:
                    raise ValidationError("workspace could not be claimed")
                return claim_row

    def _issue_session(
        self,
        cur,
        user_row: dict[str, Any],
        *,
        user_agent: str | None,
        ip_addr: str | None,
    ) -> IssuedAuthSession:
        refresh_token = generate_refresh_token()
        refresh_token_hash = hash_token(refresh_token)
        refresh_token_expires_at = datetime.now(UTC) + timedelta(
            days=self.settings.auth_refresh_ttl_days,
        )

        cur.execute(
            sql.CREATE_SESSION,
            {
                "user_id": str(user_row["user_id"]),
                "refresh_token_hash": refresh_token_hash,
                "expires_at": refresh_token_expires_at,
                "user_agent": user_agent,
                "ip_addr": ip_addr,
            },
        )
        session_row = cur.fetchone()
        if not session_row:
            raise ValidationError("unable to create auth session")

        return self._build_auth_session(
            user_row=user_row,
            session_id=UUID(str(session_row["session_id"])),
            refresh_token=refresh_token,
            refresh_token_expires_at=refresh_token_expires_at,
        )

    def _build_auth_session(
        self,
        *,
        user_row: dict[str, Any],
        session_id: UUID,
        refresh_token: str,
        refresh_token_expires_at: datetime,
    ) -> IssuedAuthSession:
        access_token_expires_at = datetime.now(UTC) + timedelta(
            minutes=self.settings.auth_access_ttl_minutes,
        )
        access_token = encode_access_token(
            user_id=UUID(str(user_row["user_id"])),
            session_id=session_id,
            expires_at=access_token_expires_at,
        )
        return IssuedAuthSession(
            user=self._sanitize_user_row(user_row),
            session_id=session_id,
            access_token=access_token,
            refresh_token=refresh_token,
            csrf_token=generate_csrf_token(),
            access_token_expires_at=access_token_expires_at,
            refresh_token_expires_at=refresh_token_expires_at,
        )

    def _record_failed_login(self, cur, user_row: dict[str, Any]) -> None:
        next_attempt = int(user_row.get("failed_login_attempts") or 0) + 1
        locked_until = None
        if next_attempt >= self.settings.auth_lock_after_failed_attempts:
            locked_until = datetime.now(UTC) + timedelta(minutes=self.settings.auth_lock_minutes)

        cur.execute(
            sql.RECORD_FAILED_LOGIN,
            {
                "user_id": str(user_row["user_id"]),
                "locked_until": locked_until,
            },
        )
        cur.fetchone()

    def _sanitize_user_row(self, user_row: dict[str, Any]) -> dict[str, Any]:
        return {
            "user_id": user_row["user_id"],
            "email": str(user_row["email"]),
            "display_name": user_row.get("display_name"),
            "status": user_row["status"],
            "primary_auth_provider": user_row["primary_auth_provider"],
            "email_verified_at": user_row.get("email_verified_at"),
            "last_login_at": user_row.get("last_login_at"),
            "created_at": user_row["created_at"],
            "updated_at": user_row["updated_at"],
        }

    def _check_auth_rate_limit(self, bucket: str, identifier: str, ip_addr: str | None) -> None:
        limit_key = f"{identifier}:{ip_addr or 'unknown'}"
        self.rate_limiter.check(
            bucket=bucket,
            key=limit_key,
            limit=10,
            window_seconds=300,
        )

    @staticmethod
    def _validate_email(email: str) -> None:
        candidate = email.strip()
        if "@" not in candidate or candidate.startswith("@") or candidate.endswith("@"):
            raise ValidationError("email must be valid")
        local_part, _, domain = candidate.partition("@")
        if "." not in domain or not local_part or not domain:
            raise ValidationError("email must be valid")

    @staticmethod
    def _normalize_provider(provider: str) -> str:
        normalized = provider.strip().lower()
        if normalized not in {"google", "github"}:
            raise ValidationError("unsupported auth provider")
        return normalized

    def _build_oauth_redirect_uri(self, provider: str, backend_base_url: str) -> str:
        if provider == "google" and self.settings.auth_google_redirect_uri:
            return self.settings.auth_google_redirect_uri
        if provider == "github" and self.settings.auth_github_redirect_uri:
            return self.settings.auth_github_redirect_uri

        base_url = backend_base_url.rstrip("/")
        return f"{base_url}{self.settings.api_prefix}/auth/oauth/{provider}/callback"

    def _build_provider_authorization_url(
        self,
        *,
        provider: str,
        state_token: str,
        redirect_uri: str,
        code_verifier: str | None,
    ) -> str:
        if provider == "google":
            query = urlencode(
                {
                    "client_id": self.settings.auth_google_client_id,
                    "redirect_uri": redirect_uri,
                    "response_type": "code",
                    "scope": "openid email profile",
                    "state": state_token,
                    "access_type": "offline",
                    "prompt": "select_account",
                    "code_challenge": build_pkce_code_challenge(code_verifier or ""),
                    "code_challenge_method": "S256",
                },
            )
            return f"https://accounts.google.com/o/oauth2/v2/auth?{query}"

        query = urlencode(
            {
                "client_id": self.settings.auth_github_client_id,
                "redirect_uri": redirect_uri,
                "scope": "read:user user:email",
                "state": state_token,
            },
        )
        return f"https://github.com/login/oauth/authorize?{query}"

    def _ensure_oauth_is_configured(self, provider: str) -> None:
        if provider == "google":
            if not self.settings.auth_google_client_id or not self.settings.auth_google_client_secret:
                raise ValidationError("google oauth is not configured")
            return

        if not self.settings.auth_github_client_id or not self.settings.auth_github_client_secret:
            raise ValidationError("github oauth is not configured")

    def _resolve_oauth_profile(
        self,
        *,
        provider: str,
        code: str,
        redirect_uri: str,
        code_verifier: str | None,
    ) -> dict[str, Any]:
        if provider == "google":
            return self._resolve_google_profile(
                code=code,
                redirect_uri=redirect_uri,
                code_verifier=code_verifier,
            )
        return self._resolve_github_profile(code=code, redirect_uri=redirect_uri)

    def _resolve_google_profile(
        self,
        *,
        code: str,
        redirect_uri: str,
        code_verifier: str | None,
    ) -> dict[str, Any]:
        token_response = self.http_client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": self.settings.auth_google_client_id,
                "client_secret": self.settings.auth_google_client_secret,
                "code": code,
                "code_verifier": code_verifier,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        token_response.raise_for_status()
        token_payload = token_response.json()
        access_token = token_payload.get("access_token")
        if not access_token:
            raise ValidationError("google oauth token exchange failed")

        profile_response = self.http_client.get(
            "https://openidconnect.googleapis.com/v1/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        profile_response.raise_for_status()
        profile = profile_response.json()

        email = profile.get("email")
        subject = profile.get("sub")
        if not email or not subject:
            raise ValidationError("google account did not provide the required identity data")

        return {
            "provider_subject": str(subject),
            "email": str(email).strip().lower(),
            "display_name": profile.get("name"),
            "is_email_verified": bool(profile.get("email_verified", False)),
        }

    def _resolve_github_profile(
        self,
        *,
        code: str,
        redirect_uri: str,
    ) -> dict[str, Any]:
        token_response = self.http_client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": self.settings.auth_github_client_id,
                "client_secret": self.settings.auth_github_client_secret,
                "code": code,
                "redirect_uri": redirect_uri,
            },
            headers={"Accept": "application/json"},
        )
        token_response.raise_for_status()
        token_payload = token_response.json()
        access_token = token_payload.get("access_token")
        if not access_token:
            raise ValidationError("github oauth token exchange failed")

        profile_response = self.http_client.get(
            "https://api.github.com/user",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
            },
        )
        profile_response.raise_for_status()
        profile = profile_response.json()

        email_response = self.http_client.get(
            "https://api.github.com/user/emails",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
            },
        )
        email_response.raise_for_status()
        emails = email_response.json()

        primary_verified_email = next(
            (
                item["email"]
                for item in emails
                if item.get("primary") and item.get("verified") and item.get("email")
            ),
            None,
        )
        fallback_verified_email = next(
            (item["email"] for item in emails if item.get("verified") and item.get("email")),
            None,
        )
        email = primary_verified_email or fallback_verified_email
        if not email or profile.get("id") is None:
            raise ValidationError("github account must expose a verified email address")

        return {
            "provider_subject": str(profile["id"]),
            "email": str(email).strip().lower(),
            "display_name": profile.get("name") or profile.get("login"),
            "is_email_verified": True,
        }
