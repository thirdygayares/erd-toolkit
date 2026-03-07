-- Restrict project list to authenticated user's owned or member projects only
-- Avoid leaking public/guest projects into authenticated list API

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
  WITH current_user_ctx AS (
    SELECT nullif(current_setting('app.current_user_uuid', true), '')::uuid AS user_id
  )
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
  CROSS JOIN current_user_ctx cu
  WHERE cu.user_id IS NOT NULL
    AND p.is_archived = false
    AND (
      p.owner_user_id = cu.user_id
      OR EXISTS (
        SELECT 1
        FROM erd.workspace_member wm
        WHERE wm.workspace_id = p.workspace_id
          AND wm.user_id = cu.user_id
      )
    )
  ORDER BY w.created_at DESC, p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION api.fn_project_list_for_current_user() TO app_user, app_service;
