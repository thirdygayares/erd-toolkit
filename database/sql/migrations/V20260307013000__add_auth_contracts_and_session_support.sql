ALTER TABLE erd.app_user
  ADD COLUMN IF NOT EXISTS email_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS primary_auth_provider text NOT NULL DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'app_user_primary_auth_provider_ck'
      AND conrelid = 'erd.app_user'::regclass
  ) THEN
    ALTER TABLE erd.app_user
      ADD CONSTRAINT app_user_primary_auth_provider_ck
      CHECK (primary_auth_provider IN ('email', 'google', 'github'));
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS erd.user_auth_identity (
  auth_identity_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES erd.app_user(user_id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_subject text NOT NULL,
  provider_email citext,
  is_email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_auth_identity_provider_ck
    CHECK (provider IN ('email', 'google', 'github')),
  CONSTRAINT user_auth_identity_provider_subject_unq
    UNIQUE (provider, provider_subject),
  CONSTRAINT user_auth_identity_user_provider_unq
    UNIQUE (user_id, provider)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_auth_identity_provider_email_unq
  ON erd.user_auth_identity (provider, provider_email)
  WHERE provider_email IS NOT NULL;

CREATE TRIGGER trg_set_updated_at_user_auth_identity
BEFORE UPDATE ON erd.user_auth_identity
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS erd.user_session (
  session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES erd.app_user(user_id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  user_agent text,
  ip_addr inet,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_session_user_expires
  ON erd.user_session (user_id, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_session_active
  ON erd.user_session (user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TRIGGER trg_set_updated_at_user_session
BEFORE UPDATE ON erd.user_session
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS erd.oauth_transaction (
  oauth_transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  state_token text NOT NULL UNIQUE,
  code_verifier text,
  redirect_path text,
  guest_workspace_id uuid REFERENCES erd.workspace(workspace_id) ON DELETE SET NULL,
  guest_project_id uuid REFERENCES erd.project(project_id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT oauth_transaction_provider_ck
    CHECK (provider IN ('google', 'github'))
);

CREATE INDEX IF NOT EXISTS idx_oauth_transaction_active
  ON erd.oauth_transaction (provider, state_token, expires_at)
  WHERE consumed_at IS NULL;

CREATE TRIGGER trg_set_updated_at_oauth_transaction
BEFORE UPDATE ON erd.oauth_transaction
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TABLE IF NOT EXISTS erd.user_enrollment_event (
  enrollment_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES erd.app_user(user_id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES erd.workspace(workspace_id) ON DELETE SET NULL,
  project_id uuid REFERENCES erd.project(project_id) ON DELETE SET NULL,
  event_type text NOT NULL,
  provider text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_enrollment_event_type_ck
    CHECK (event_type IN ('register', 'login_success', 'logout', 'guest_claim')),
  CONSTRAINT user_enrollment_event_provider_ck
    CHECK (
      provider IS NULL
      OR provider IN ('email', 'google', 'github')
    )
);

CREATE INDEX IF NOT EXISTS idx_user_enrollment_event_user_created
  ON erd.user_enrollment_event (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION api.fn_auth_user_get(
  p_user_id uuid
)
RETURNS TABLE (
  user_id uuid,
  email citext,
  display_name text,
  status text,
  primary_auth_provider text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    u.user_id,
    u.email,
    u.display_name,
    u.status,
    u.primary_auth_provider,
    u.email_verified_at,
    u.last_login_at,
    u.created_at,
    u.updated_at
  FROM erd.app_user u
  WHERE u.user_id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_current_user()
RETURNS TABLE (
  user_id uuid,
  email citext,
  display_name text,
  status text,
  primary_auth_provider text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT *
  FROM api.fn_auth_user_get(api.fn_current_user_uuid());
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_user_register_email(
  p_email citext,
  p_password_hash text,
  p_display_name text,
  p_email_verified_at timestamptz DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  email citext,
  display_name text,
  status text,
  primary_auth_provider text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_user erd.app_user;
  v_email citext;
  v_display_name text;
BEGIN
  v_email := NULLIF(lower(btrim(p_email::text)), '')::citext;
  v_display_name := NULLIF(btrim(p_display_name), '');

  IF v_email IS NULL THEN
    RAISE EXCEPTION 'email is required'
      USING ERRCODE = '22023';
  END IF;

  IF NULLIF(btrim(p_password_hash), '') IS NULL THEN
    RAISE EXCEPTION 'password hash is required'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO erd.app_user (
    email,
    display_name,
    password_hash,
    status,
    primary_auth_provider,
    email_verified_at
  )
  VALUES (
    v_email,
    v_display_name,
    p_password_hash,
    'active',
    'email',
    p_email_verified_at
  )
  RETURNING * INTO v_user;

  INSERT INTO erd.user_auth_identity (
    user_id,
    provider,
    provider_subject,
    provider_email,
    is_email_verified
  )
  VALUES (
    v_user.user_id,
    'email',
    v_email::text,
    v_email,
    p_email_verified_at IS NOT NULL
  );

  INSERT INTO erd.user_enrollment_event (
    user_id,
    event_type,
    provider,
    metadata
  )
  VALUES (
    v_user.user_id,
    'register',
    'email',
    jsonb_build_object('source', 'email')
  );

  RETURN QUERY
  SELECT
    v_user.user_id,
    v_user.email,
    v_user.display_name,
    v_user.status,
    v_user.primary_auth_provider,
    v_user.email_verified_at,
    v_user.last_login_at,
    v_user.created_at,
    v_user.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_user_login_email(
  p_email citext
)
RETURNS TABLE (
  user_id uuid,
  email citext,
  display_name text,
  password_hash text,
  status text,
  primary_auth_provider text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  failed_login_attempts integer,
  locked_until timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    u.user_id,
    u.email,
    u.display_name,
    u.password_hash,
    u.status,
    u.primary_auth_provider,
    u.email_verified_at,
    u.last_login_at,
    u.failed_login_attempts,
    u.locked_until,
    u.created_at,
    u.updated_at
  FROM erd.app_user u
  WHERE u.email = NULLIF(lower(btrim(p_email::text)), '')::citext
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_user_record_failed_login(
  p_user_id uuid,
  p_locked_until timestamptz DEFAULT NULL
)
RETURNS TABLE (
  failed_login_attempts integer,
  locked_until timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  UPDATE erd.app_user u
  SET
    failed_login_attempts = u.failed_login_attempts + 1,
    locked_until = COALESCE(p_locked_until, u.locked_until)
  WHERE u.user_id = p_user_id
  RETURNING u.failed_login_attempts, u.locked_until;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_user_finalize_login(
  p_user_id uuid,
  p_provider text,
  p_event_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  user_id uuid,
  email citext,
  display_name text,
  status text,
  primary_auth_provider text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_user erd.app_user;
BEGIN
  IF p_provider NOT IN ('email', 'google', 'github') THEN
    RAISE EXCEPTION 'unsupported auth provider'
      USING ERRCODE = '22023';
  END IF;

  UPDATE erd.app_user u
  SET
    failed_login_attempts = 0,
    locked_until = NULL,
    last_login_at = now()
  WHERE u.user_id = p_user_id
  RETURNING * INTO v_user;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO erd.user_enrollment_event (
    user_id,
    event_type,
    provider,
    metadata
  )
  VALUES (
    v_user.user_id,
    'login_success',
    p_provider,
    COALESCE(p_event_metadata, '{}'::jsonb)
  );

  RETURN QUERY
  SELECT
    v_user.user_id,
    v_user.email,
    v_user.display_name,
    v_user.status,
    v_user.primary_auth_provider,
    v_user.email_verified_at,
    v_user.last_login_at,
    v_user.created_at,
    v_user.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_user_upsert_by_oauth(
  p_provider text,
  p_provider_subject text,
  p_provider_email citext,
  p_display_name text,
  p_is_email_verified boolean DEFAULT true
)
RETURNS TABLE (
  user_id uuid,
  email citext,
  display_name text,
  status text,
  primary_auth_provider text,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_user erd.app_user;
  v_provider text;
  v_provider_subject text;
  v_provider_email citext;
  v_display_name text;
BEGIN
  v_provider := NULLIF(lower(btrim(p_provider)), '');
  v_provider_subject := NULLIF(btrim(p_provider_subject), '');
  v_provider_email := NULLIF(lower(btrim(p_provider_email::text)), '')::citext;
  v_display_name := NULLIF(btrim(p_display_name), '');

  IF v_provider NOT IN ('google', 'github') THEN
    RAISE EXCEPTION 'unsupported auth provider'
      USING ERRCODE = '22023';
  END IF;

  IF v_provider_subject IS NULL THEN
    RAISE EXCEPTION 'provider subject is required'
      USING ERRCODE = '22023';
  END IF;

  IF v_provider_email IS NULL THEN
    RAISE EXCEPTION 'provider email is required'
      USING ERRCODE = '22023';
  END IF;

  SELECT u.*
  INTO v_user
  FROM erd.user_auth_identity i
  JOIN erd.app_user u ON u.user_id = i.user_id
  WHERE i.provider = v_provider
    AND i.provider_subject = v_provider_subject
  LIMIT 1;

  IF NOT FOUND AND p_is_email_verified THEN
    SELECT u.*
    INTO v_user
    FROM erd.app_user u
    WHERE u.email = v_provider_email
    LIMIT 1;
  END IF;

  IF NOT FOUND THEN
    INSERT INTO erd.app_user (
      email,
      display_name,
      status,
      primary_auth_provider,
      email_verified_at
    )
    VALUES (
      v_provider_email,
      v_display_name,
      'active',
      v_provider,
      CASE
        WHEN p_is_email_verified THEN now()
        ELSE NULL
      END
    )
    RETURNING * INTO v_user;
  ELSE
    UPDATE erd.app_user u
    SET
      display_name = COALESCE(u.display_name, v_display_name),
      email_verified_at = CASE
        WHEN p_is_email_verified THEN COALESCE(u.email_verified_at, now())
        ELSE u.email_verified_at
      END
    WHERE u.user_id = v_user.user_id
    RETURNING * INTO v_user;
  END IF;

  INSERT INTO erd.user_auth_identity (
    user_id,
    provider,
    provider_subject,
    provider_email,
    is_email_verified
  )
  VALUES (
    v_user.user_id,
    v_provider,
    v_provider_subject,
    v_provider_email,
    p_is_email_verified
  )
  ON CONFLICT (provider, provider_subject)
  DO UPDATE SET
    user_id = EXCLUDED.user_id,
    provider_email = EXCLUDED.provider_email,
    is_email_verified = EXCLUDED.is_email_verified;

  RETURN QUERY
  SELECT
    v_user.user_id,
    v_user.email,
    v_user.display_name,
    v_user.status,
    v_user.primary_auth_provider,
    v_user.email_verified_at,
    v_user.last_login_at,
    v_user.created_at,
    v_user.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_session_create(
  p_user_id uuid,
  p_refresh_token_hash text,
  p_expires_at timestamptz,
  p_user_agent text,
  p_ip_addr inet
)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  refresh_token_expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO erd.user_session (
    user_id,
    refresh_token_hash,
    user_agent,
    ip_addr,
    expires_at
  )
  VALUES (
    p_user_id,
    p_refresh_token_hash,
    NULLIF(btrim(p_user_agent), ''),
    p_ip_addr,
    p_expires_at
  )
  RETURNING
    erd.user_session.session_id,
    erd.user_session.user_id,
    erd.user_session.expires_at,
    erd.user_session.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_session_rotate_by_token_hash(
  p_current_refresh_token_hash text,
  p_new_refresh_token_hash text,
  p_expires_at timestamptz,
  p_user_agent text,
  p_ip_addr inet
)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  refresh_token_expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_current_session erd.user_session;
BEGIN
  SELECT *
  INTO v_current_session
  FROM erd.user_session s
  WHERE s.refresh_token_hash = p_current_refresh_token_hash
    AND s.revoked_at IS NULL
    AND s.expires_at > now()
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  UPDATE erd.user_session s
  SET revoked_at = now()
  WHERE s.session_id = v_current_session.session_id;

  RETURN QUERY
  INSERT INTO erd.user_session (
    user_id,
    refresh_token_hash,
    user_agent,
    ip_addr,
    expires_at
  )
  VALUES (
    v_current_session.user_id,
    p_new_refresh_token_hash,
    NULLIF(btrim(p_user_agent), ''),
    p_ip_addr,
    p_expires_at
  )
  RETURNING
    erd.user_session.session_id,
    erd.user_session.user_id,
    erd.user_session.expires_at,
    erd.user_session.created_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_session_revoke_by_token_hash(
  p_refresh_token_hash text
)
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  revoked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_revoked_session erd.user_session;
BEGIN
  UPDATE erd.user_session s
  SET revoked_at = COALESCE(s.revoked_at, now())
  WHERE s.refresh_token_hash = p_refresh_token_hash
    AND s.revoked_at IS NULL
  RETURNING * INTO v_revoked_session;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO erd.user_enrollment_event (
    user_id,
    event_type,
    metadata
  )
  VALUES (
    v_revoked_session.user_id,
    'logout',
    jsonb_build_object('session_id', v_revoked_session.session_id)
  );

  RETURN QUERY
  SELECT
    v_revoked_session.session_id,
    v_revoked_session.user_id,
    v_revoked_session.revoked_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_oauth_transaction_create(
  p_provider text,
  p_state_token text,
  p_code_verifier text,
  p_redirect_path text,
  p_guest_workspace_id uuid,
  p_guest_project_id uuid,
  p_expires_at timestamptz
)
RETURNS TABLE (
  state_token text,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_provider text;
BEGIN
  v_provider := NULLIF(lower(btrim(p_provider)), '');

  IF v_provider NOT IN ('google', 'github') THEN
    RAISE EXCEPTION 'unsupported auth provider'
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  INSERT INTO erd.oauth_transaction (
    provider,
    state_token,
    code_verifier,
    redirect_path,
    guest_workspace_id,
    guest_project_id,
    expires_at
  )
  VALUES (
    v_provider,
    p_state_token,
    NULLIF(btrim(p_code_verifier), ''),
    NULLIF(btrim(p_redirect_path), ''),
    p_guest_workspace_id,
    p_guest_project_id,
    p_expires_at
  )
  RETURNING
    erd.oauth_transaction.state_token,
    erd.oauth_transaction.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_oauth_transaction_consume(
  p_provider text,
  p_state_token text
)
RETURNS TABLE (
  provider text,
  state_token text,
  code_verifier text,
  redirect_path text,
  guest_workspace_id uuid,
  guest_project_id uuid,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_provider text;
BEGIN
  v_provider := NULLIF(lower(btrim(p_provider)), '');

  RETURN QUERY
  UPDATE erd.oauth_transaction t
  SET consumed_at = now()
  WHERE t.provider = v_provider
    AND t.state_token = p_state_token
    AND t.consumed_at IS NULL
    AND t.expires_at > now()
  RETURNING
    t.provider,
    t.state_token,
    t.code_verifier,
    t.redirect_path,
    t.guest_workspace_id,
    t.guest_project_id,
    t.expires_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_auth_claim_guest_workspace(
  p_user_id uuid,
  p_workspace_id uuid
)
RETURNS TABLE (
  workspace_id uuid,
  owner_user_id uuid,
  claim_status text,
  claimed_project_count integer,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_workspace erd.workspace;
  v_claim_status text := 'claimed';
  v_claimed_project_count integer := 0;
BEGIN
  IF api.fn_current_user_uuid() IS NULL OR api.fn_current_user_uuid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_workspace
  FROM erd.workspace w
  WHERE w.workspace_id = p_workspace_id
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF v_workspace.owner_user_id IS NOT NULL AND v_workspace.owner_user_id <> p_user_id THEN
    RAISE EXCEPTION 'workspace already claimed'
      USING ERRCODE = '23505';
  END IF;

  IF v_workspace.owner_user_id = p_user_id THEN
    v_claim_status := 'already-owned';
  ELSE
    UPDATE erd.workspace w
    SET
      owner_user_id = p_user_id,
      workspace_mode = CASE
        WHEN w.workspace_mode = 'guest' THEN 'personal'
        ELSE w.workspace_mode
      END,
      updated_by = p_user_id
    WHERE w.workspace_id = p_workspace_id
    RETURNING * INTO v_workspace;
  END IF;

  INSERT INTO erd.workspace_member (
    workspace_id,
    user_id,
    role,
    invited_at,
    joined_at
  )
  VALUES (
    p_workspace_id,
    p_user_id,
    'owner',
    now(),
    now()
  )
  ON CONFLICT (workspace_id, user_id)
  DO UPDATE SET
    role = 'owner',
    joined_at = COALESCE(erd.workspace_member.joined_at, EXCLUDED.joined_at);

  UPDATE erd.project p
  SET
    owner_user_id = COALESCE(p.owner_user_id, p_user_id),
    updated_by = p_user_id
  WHERE p.workspace_id = p_workspace_id
    AND (p.owner_user_id IS NULL OR p.owner_user_id = p_user_id);

  GET DIAGNOSTICS v_claimed_project_count = ROW_COUNT;

  INSERT INTO erd.user_enrollment_event (
    user_id,
    workspace_id,
    event_type,
    metadata
  )
  VALUES (
    p_user_id,
    p_workspace_id,
    'guest_claim',
    jsonb_build_object(
      'claim_status', v_claim_status,
      'claimed_project_count', v_claimed_project_count
    )
  );

  RETURN QUERY
  SELECT
    v_workspace.workspace_id,
    p_user_id,
    v_claim_status,
    v_claimed_project_count,
    v_workspace.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_auth_user_get(uuid)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_current_user()
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_user_register_email(citext, text, text, timestamptz)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_user_login_email(citext)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_user_record_failed_login(uuid, timestamptz)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_user_finalize_login(uuid, text, jsonb)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_user_upsert_by_oauth(text, text, citext, text, boolean)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_session_create(uuid, text, timestamptz, text, inet)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_session_rotate_by_token_hash(text, text, timestamptz, text, inet)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_session_revoke_by_token_hash(text)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_oauth_transaction_create(text, text, text, text, uuid, uuid, timestamptz)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_oauth_transaction_consume(text, text)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_auth_claim_guest_workspace(uuid, uuid)
TO app_user, app_service;
