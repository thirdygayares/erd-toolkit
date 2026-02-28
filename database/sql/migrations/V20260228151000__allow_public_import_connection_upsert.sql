CREATE OR REPLACE FUNCTION api.fn_db_connection_upsert(
  p_workspace_id uuid,
  p_name text,
  p_host text,
  p_port integer,
  p_database_name text,
  p_username text,
  p_password_secret_ref text,
  p_ssl_mode text
)
RETURNS TABLE (connection_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT (
    api.fn_can_edit_workspace(p_workspace_id)
    OR EXISTS (
      SELECT 1
      FROM erd.project p
      WHERE p.workspace_id = p_workspace_id
        AND p.visibility = 'public'
        AND p.allow_anonymous_edit = true
        AND p.share_slug = api.fn_current_share_slug()
    )
  ) THEN
    RAISE EXCEPTION 'forbidden to edit workspace %', p_workspace_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.db_connection (
    workspace_id,
    name,
    host,
    port,
    database_name,
    username,
    password_secret_ref,
    ssl_mode,
    is_active
  )
  VALUES (
    p_workspace_id,
    p_name,
    p_host,
    p_port,
    p_database_name,
    p_username,
    p_password_secret_ref,
    p_ssl_mode,
    true
  )
  ON CONFLICT (workspace_id, name)
  DO UPDATE SET
    host = EXCLUDED.host,
    port = EXCLUDED.port,
    database_name = EXCLUDED.database_name,
    username = EXCLUDED.username,
    password_secret_ref = EXCLUDED.password_secret_ref,
    ssl_mode = EXCLUDED.ssl_mode,
    is_active = true,
    updated_at = now()
  RETURNING erd.db_connection.connection_id;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_db_connection_upsert(uuid, text, text, integer, text, text, text, text)
TO app_anon, app_user, app_service;
