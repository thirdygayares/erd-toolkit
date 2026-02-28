DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_anon') THEN
    CREATE ROLE app_anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
    CREATE ROLE app_service NOLOGIN;
  END IF;
END $$;

GRANT USAGE ON SCHEMA api TO app_anon, app_user, app_service;
GRANT USAGE ON SCHEMA erd TO app_service;

CREATE OR REPLACE FUNCTION api.fn_current_user_uuid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_user_uuid', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION api.fn_current_share_slug()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.project_share_slug', true), '');
$$;

CREATE OR REPLACE FUNCTION api.fn_request_mode()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.request_mode', true), '');
$$;

CREATE OR REPLACE FUNCTION api.fn_is_workspace_member(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.workspace_member wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
  );
$$;

CREATE OR REPLACE FUNCTION api.fn_is_workspace_editor(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.workspace_member wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
      AND wm.role IN ('owner', 'admin', 'editor')
  );
$$;

CREATE OR REPLACE FUNCTION api.fn_is_workspace_admin(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.workspace_member wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
      AND wm.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION api.fn_can_read_workspace(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.workspace w
    WHERE w.workspace_id = p_workspace_id
      AND (
        w.owner_user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
        OR EXISTS (
          SELECT 1
          FROM erd.workspace_member wm
          WHERE wm.workspace_id = w.workspace_id
            AND wm.user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION api.fn_can_edit_workspace(p_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.workspace w
    WHERE w.workspace_id = p_workspace_id
      AND (
        w.owner_user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
        OR EXISTS (
          SELECT 1
          FROM erd.workspace_member wm
          WHERE wm.workspace_id = w.workspace_id
            AND wm.user_id = nullif(current_setting('app.current_user_uuid', true), '')::uuid
            AND wm.role IN ('owner', 'admin', 'editor')
        )
      )
  );
$$;

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

CREATE OR REPLACE FUNCTION api.fn_can_read_diagram(p_diagram_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.diagram d
    WHERE d.diagram_id = p_diagram_id
      AND api.fn_can_read_project(d.project_id)
  );
$$;

CREATE OR REPLACE FUNCTION api.fn_can_edit_diagram(p_diagram_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM erd.diagram d
    WHERE d.diagram_id = p_diagram_id
      AND api.fn_can_edit_project(d.project_id)
  );
$$;

GRANT EXECUTE ON FUNCTION api.fn_current_user_uuid() TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_current_share_slug() TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_request_mode() TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_is_workspace_member(uuid) TO app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_is_workspace_editor(uuid) TO app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_is_workspace_admin(uuid) TO app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_can_read_workspace(uuid) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_can_edit_workspace(uuid) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_can_read_project(uuid) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_can_edit_project(uuid) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_can_read_diagram(uuid) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_can_edit_diagram(uuid) TO app_anon, app_user, app_service;
