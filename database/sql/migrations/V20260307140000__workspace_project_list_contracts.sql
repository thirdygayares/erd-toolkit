-- Workspace and Project listing contracts for authenticated users
-- Supports multi-workspace project list view with grouping

-- Lists all workspaces the current authenticated user can access
-- Returns: workspace details for grouping in project list UI
CREATE OR REPLACE FUNCTION api.fn_workspace_list_for_current_user()
RETURNS TABLE (
  workspace_id uuid,
  name text,
  slug text,
  workspace_mode text,
  owner_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    w.workspace_id,
    w.name,
    w.slug,
    w.workspace_mode,
    w.owner_user_id,
    w.created_at,
    w.updated_at
  FROM erd.workspace w
  WHERE api.fn_can_read_workspace(w.workspace_id)
  ORDER BY w.created_at DESC;
$$;

-- Lists all projects the current authenticated user can access
-- Includes workspace metadata for grouping (name, mode)
-- Filters out archived projects by default
CREATE OR REPLACE FUNCTION api.fn_project_list_for_current_user()
RETURNS TABLE (
  project_id uuid,
  workspace_id uuid,
  workspace_name text,
  workspace_mode text,
  name text,
  description text,
  visibility text,
  share_slug text,
  allow_anonymous_edit boolean,
  is_archived boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    p.project_id,
    p.workspace_id,
    w.name AS workspace_name,
    w.workspace_mode,
    p.name,
    p.description,
    p.visibility,
    p.share_slug,
    p.allow_anonymous_edit,
    p.is_archived,
    p.created_at,
    p.updated_at
  FROM erd.project p
  JOIN erd.workspace w ON w.workspace_id = p.workspace_id
  WHERE api.fn_can_read_project(p.project_id)
    AND p.is_archived = false
  ORDER BY w.created_at DESC, p.created_at DESC;
$$;

-- Ensures current authenticated user has a default workspace
-- Idempotent: creates "Default Workspace" only if user has none
-- Also adds owner membership row to workspace_member table for consistency
CREATE OR REPLACE FUNCTION api.fn_workspace_ensure_default_for_current_user()
RETURNS TABLE (
  workspace_id uuid,
  name text,
  slug text,
  workspace_mode text,
  owner_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  was_created boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_was_created boolean := false;
  v_default_slug text;
BEGIN
  v_user_id := api.fn_current_user_uuid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated user cannot ensure default workspace';
  END IF;

  -- Check if user already has a default workspace (any personal workspace)
  SELECT w.workspace_id
  INTO v_workspace_id
  FROM erd.workspace w
  WHERE w.owner_user_id = v_user_id
    AND w.workspace_mode = 'personal'
  LIMIT 1;

  -- If user has no personal workspace, create one
  IF v_workspace_id IS NULL THEN
    v_default_slug := 'default-workspace-' || substring(v_user_id::text, 1, 8);

    INSERT INTO erd.workspace (
      name,
      slug,
      owner_user_id,
      workspace_mode,
      created_by,
      updated_by
    )
    VALUES (
      'Default Workspace',
      v_default_slug,
      v_user_id,
      'personal',
      v_user_id,
      v_user_id
    )
    RETURNING erd.workspace.workspace_id INTO v_workspace_id;

    v_was_created := true;

    -- Add owner membership row for consistency
    INSERT INTO erd.workspace_member (
      workspace_id,
      user_id,
      role,
      joined_at
    )
    VALUES (
      v_workspace_id,
      v_user_id,
      'owner',
      now()
    )
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
  END IF;

  -- Return the ensured workspace
  RETURN QUERY
  SELECT
    w.workspace_id,
    w.name,
    w.slug,
    w.workspace_mode,
    w.owner_user_id,
    w.created_at,
    w.updated_at,
    v_was_created
  FROM erd.workspace w
  WHERE w.workspace_id = v_workspace_id;
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION api.fn_workspace_list_for_current_user() TO app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_project_list_for_current_user() TO app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_workspace_ensure_default_for_current_user() TO app_user, app_service;
