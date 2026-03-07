from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from app.core.errors import UnauthorizedError, ValidationError
from app.core.security import (
    decode_access_token,
    encode_access_token,
    hash_password,
    validate_password_policy,
    verify_password,
)


def test_password_hash_round_trip():
    password_hash = hash_password("StrongPass123")

    assert verify_password("StrongPass123", password_hash) is True
    assert verify_password("WrongPass123", password_hash) is False


def test_password_policy_rejects_common_value():
    with pytest.raises(ValidationError):
        validate_password_policy("password123")


def test_access_token_round_trip():
    user_id = uuid4()
    session_id = uuid4()
    expires_at = (datetime.now(UTC) + timedelta(minutes=15)).replace(microsecond=0)

    token = encode_access_token(
        user_id=user_id,
        session_id=session_id,
        expires_at=expires_at,
    )
    payload = decode_access_token(token)

    assert payload.user_id == user_id
    assert payload.session_id == session_id
    assert payload.expires_at == expires_at


def test_invalid_access_token_raises():
    with pytest.raises(UnauthorizedError):
        decode_access_token("not-a-valid-token")
