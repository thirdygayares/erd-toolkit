REGISTER_EMAIL = """
SELECT *
FROM api.fn_auth_user_register_email(
    p_email => %(email)s::citext,
    p_password_hash => %(password_hash)s,
    p_display_name => %(display_name)s,
    p_email_verified_at => %(email_verified_at)s::timestamptz
);
"""

LOGIN_EMAIL = """
SELECT *
FROM api.fn_auth_user_login_email(
    p_email => %(email)s::citext
)
LIMIT 1;
"""

RECORD_FAILED_LOGIN = """
SELECT *
FROM api.fn_auth_user_record_failed_login(
    p_user_id => %(user_id)s::uuid,
    p_locked_until => %(locked_until)s::timestamptz
);
"""

FINALIZE_LOGIN = """
SELECT *
FROM api.fn_auth_user_finalize_login(
    p_user_id => %(user_id)s::uuid,
    p_provider => %(provider)s,
    p_event_metadata => %(event_metadata)s::jsonb
);
"""

GET_USER = """
SELECT *
FROM api.fn_auth_user_get(
    p_user_id => %(user_id)s::uuid
)
LIMIT 1;
"""

GET_CURRENT_USER = """
SELECT *
FROM api.fn_auth_current_user()
LIMIT 1;
"""

UPSERT_OAUTH_USER = """
SELECT *
FROM api.fn_auth_user_upsert_by_oauth(
    p_provider => %(provider)s,
    p_provider_subject => %(provider_subject)s,
    p_provider_email => %(provider_email)s::citext,
    p_display_name => %(display_name)s,
    p_is_email_verified => %(is_email_verified)s
);
"""

CREATE_SESSION = """
SELECT *
FROM api.fn_auth_session_create(
    p_user_id => %(user_id)s::uuid,
    p_refresh_token_hash => %(refresh_token_hash)s,
    p_expires_at => %(expires_at)s::timestamptz,
    p_user_agent => %(user_agent)s,
    p_ip_addr => %(ip_addr)s::inet
);
"""

ROTATE_SESSION = """
SELECT *
FROM api.fn_auth_session_rotate_by_token_hash(
    p_current_refresh_token_hash => %(current_refresh_token_hash)s,
    p_new_refresh_token_hash => %(new_refresh_token_hash)s,
    p_expires_at => %(expires_at)s::timestamptz,
    p_user_agent => %(user_agent)s,
    p_ip_addr => %(ip_addr)s::inet
);
"""

REVOKE_SESSION = """
SELECT *
FROM api.fn_auth_session_revoke_by_token_hash(
    p_refresh_token_hash => %(refresh_token_hash)s
);
"""

CREATE_OAUTH_TRANSACTION = """
SELECT *
FROM api.fn_auth_oauth_transaction_create(
    p_provider => %(provider)s,
    p_state_token => %(state_token)s,
    p_code_verifier => %(code_verifier)s,
    p_redirect_path => %(redirect_path)s,
    p_guest_workspace_id => %(guest_workspace_id)s::uuid,
    p_guest_project_id => %(guest_project_id)s::uuid,
    p_expires_at => %(expires_at)s::timestamptz
);
"""

CONSUME_OAUTH_TRANSACTION = """
SELECT *
FROM api.fn_auth_oauth_transaction_consume(
    p_provider => %(provider)s,
    p_state_token => %(state_token)s
)
LIMIT 1;
"""

CLAIM_GUEST_WORKSPACE = """
SELECT *
FROM api.fn_auth_claim_guest_workspace(
    p_user_id => %(user_id)s::uuid,
    p_workspace_id => %(workspace_id)s::uuid
)
LIMIT 1;
"""
