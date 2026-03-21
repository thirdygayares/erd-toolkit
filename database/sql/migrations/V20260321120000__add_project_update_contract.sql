-- Project update contract
-- Supports inline project metadata updates (name/description) with edit permission checks.

DROP FUNCTION IF EXISTS api.fn_project_update(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION api.fn_project_update(
  p_project_id uuid,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS erd.project
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_project erd.project;
  v_next_name text;
BEGIN
  v_next_name := NULLIF(btrim(p_name), '');

  UPDATE erd.project p
  SET
    name = COALESCE(v_next_name, p.name),
    description = COALESCE(p_description, p.description),
    owner_user_id = COALESCE(p.owner_user_id, p_actor_id, api.fn_current_user_uuid()),
    updated_by = COALESCE(p_actor_id, api.fn_current_user_uuid())
  WHERE p.project_id = p_project_id
    AND api.fn_can_edit_project(p.project_id)
  RETURNING p.* INTO v_project;

  RETURN v_project;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_project_update(uuid, text, text, uuid) TO app_anon, app_user, app_service;
