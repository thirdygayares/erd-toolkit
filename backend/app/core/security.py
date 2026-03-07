from __future__ import annotations

import base64
import hashlib
import secrets
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError, VerificationError

from app.core.config import get_settings
from app.core.errors import RateLimitError, UnauthorizedError, ValidationError

ACCESS_COOKIE_NAME = "erd_access_token"
REFRESH_COOKIE_NAME = "erd_refresh_token"
CSRF_COOKIE_NAME = "erd_csrf_token"
OAUTH_STATE_COOKIE_NAME = "erd_oauth_state"

_PASSWORD_HASHER = PasswordHasher()
_COMMON_PASSWORDS = {
    "1234567890",
    "1111111111",
    "admin12345",
    "password123",
    "qwerty1234",
}


@dataclass(frozen=True)
class AccessTokenPayload:
    user_id: UUID
    session_id: UUID
    expires_at: datetime


class FixedWindowRateLimiter:
    def __init__(self) -> None:
        self._entries: dict[str, list[float]] = {}

    def check(self, *, bucket: str, key: str, limit: int, window_seconds: int) -> None:
        now = time.time()
        storage_key = f"{bucket}:{key}"
        window_start = now - window_seconds
        attempts = [stamp for stamp in self._entries.get(storage_key, []) if stamp >= window_start]

        if len(attempts) >= limit:
            raise RateLimitError("too many requests, please retry later")

        attempts.append(now)
        self._entries[storage_key] = attempts

    def reset(self) -> None:
        self._entries.clear()


_RATE_LIMITER = FixedWindowRateLimiter()


def get_rate_limiter() -> FixedWindowRateLimiter:
    return _RATE_LIMITER


def hash_password(password: str) -> str:
    return _PASSWORD_HASHER.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _PASSWORD_HASHER.verify(password_hash, password)
    except (InvalidHashError, VerifyMismatchError, VerificationError):
        return False


def validate_password_policy(password: str) -> None:
    if len(password) < 10:
        raise ValidationError("password must be at least 10 characters")
    if password.lower() in _COMMON_PASSWORDS:
        raise ValidationError("password is too common")
    if not any(char.islower() for char in password):
        raise ValidationError("password must include a lowercase letter")
    if not any(char.isupper() for char in password):
        raise ValidationError("password must include an uppercase letter")
    if not any(char.isdigit() for char in password):
        raise ValidationError("password must include a number")


def generate_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def generate_state_token() -> str:
    return secrets.token_urlsafe(32)


def generate_pkce_verifier() -> str:
    return secrets.token_urlsafe(64)


def build_pkce_code_challenge(verifier: str) -> str:
    digest = hashlib.sha256(verifier.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("utf-8")


def encode_access_token(*, user_id: UUID, session_id: UUID, expires_at: datetime) -> str:
    settings = get_settings()
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "sid": str(session_id),
        "exp": expires_at,
        "iat": datetime.now(UTC),
        "iss": settings.app_name,
    }
    return jwt.encode(payload, settings.auth_jwt_access_secret, algorithm="HS256")


def decode_access_token(token: str) -> AccessTokenPayload:
    settings = get_settings()

    try:
        payload = jwt.decode(
            token,
            settings.auth_jwt_access_secret,
            algorithms=["HS256"],
            options={"require": ["sub", "sid", "exp"]},
        )
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("invalid access token") from exc

    user_id = UUID(str(payload["sub"]))
    session_id = UUID(str(payload["sid"]))
    expires_at = datetime.fromtimestamp(int(payload["exp"]), tz=UTC)
    return AccessTokenPayload(
        user_id=user_id,
        session_id=session_id,
        expires_at=expires_at,
    )
