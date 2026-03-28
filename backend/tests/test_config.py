from __future__ import annotations

import pytest

from app.core.config import Settings


def test_settings_normalize_cookie_samesite_none():
    settings = Settings(
        auth_jwt_access_secret="secret",
        auth_cookie_samesite="None",
        auth_cookie_secure=True,
    )

    assert settings.auth_cookie_samesite == "none"


def test_settings_require_secure_cookie_for_samesite_none():
    with pytest.raises(ValueError):
        Settings(
            auth_jwt_access_secret="secret",
            auth_cookie_samesite="none",
            auth_cookie_secure=False,
        )


def test_settings_require_positive_refresh_ttl_days():
    with pytest.raises(ValueError):
        Settings(
            auth_jwt_access_secret="secret",
            auth_refresh_ttl_days=0,
        )
