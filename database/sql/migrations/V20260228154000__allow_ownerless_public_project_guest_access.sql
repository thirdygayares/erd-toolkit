CREATE OR REPLACE FUNCTION api.fn_can_read_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.project p
    WHERE p.project_id = p_project_id
      AND (
        (
          p.visibility = 'public'
          AND p.share_slug IS NOT NULL
          AND p.share_slug = nullif(current_setting('app.project_share_slug', true), '')
        )
        OR (
          p.visibility = 'public'
          AND p.allow_anonymous_edit = true
          AND p.owner_user_id IS NULL
        )
        OR p.owner_user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
        OR EXISTS (
          SELECT 1
          FROM erd.workspace_member wm
          WHERE wm.workspace_id = p.workspace_id
            AND wm.user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION api.fn_can_edit_project(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.project p
    WHERE p.project_id = p_project_id
      AND (
        (
          p.visibility = 'public'
          AND p.allow_anonymous_edit = true
          AND p.share_slug IS NOT NULL
          AND p.share_slug = nullif(current_setting('app.project_share_slug', true), '')
        )
        OR (
          p.visibility = 'public'
          AND p.allow_anonymous_edit = true
          AND p.owner_user_id IS NULL
        )
        OR p.owner_user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
        OR EXISTS (
          SELECT 1
          FROM erd.workspace_member wm
          WHERE wm.workspace_id = p.workspace_id
            AND wm.user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
            AND wm.role IN ('owner', 'admin', 'editor')
        )
      )
  );
$$;

GRANT EXECUTE ON FUNCTION api.fn_can_read_project(uuid) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_can_edit_project(uuid) TO app_anon, app_user, app_service;
