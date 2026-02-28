-- Forward-only replacement for previous repeatable api contracts

CREATE OR REPLACE VIEW api.vw_projects AS
SELECT
  p.project_id,
  p.workspace_id,
  p.owner_user_id,
  p.name,
  p.description,
  p.visibility,
  p.share_slug,
  p.allow_anonymous_edit,
  p.is_archived,
  p.created_at,
  p.updated_at
FROM erd.project p;

CREATE OR REPLACE VIEW api.vw_diagrams AS
SELECT
  d.diagram_id,
  d.workspace_id,
  d.project_id,
  d.name,
  d.description,
  d.source_kind,
  d.source_schema_hash,
  d.last_synced_at,
  d.version_no,
  d.viewport_x,
  d.viewport_y,
  d.viewport_zoom,
  d.created_at,
  d.updated_at
FROM erd.diagram d;

CREATE OR REPLACE FUNCTION api.fn_project_create(
  p_workspace_id uuid,
  p_name text,
  p_visibility text DEFAULT 'public',
  p_description text DEFAULT NULL,
  p_allow_anonymous_edit boolean DEFAULT true,
  p_share_slug text DEFAULT NULL
)
RETURNS erd.project
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_share_slug text;
  v_project erd.project;
BEGIN
  v_share_slug := COALESCE(p_share_slug, encode(public.gen_random_bytes(8), 'hex'));

  INSERT INTO erd.project (
    workspace_id,
    owner_user_id,
    name,
    description,
    visibility,
    share_slug,
    allow_anonymous_edit
  )
  VALUES (
    p_workspace_id,
    api.fn_current_user_uuid(),
    p_name,
    p_description,
    p_visibility,
    v_share_slug,
    p_allow_anonymous_edit
  )
  RETURNING * INTO v_project;

  RETURN v_project;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_project_get_by_share_slug(
  p_share_slug text
)
RETURNS SETOF erd.project
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT p.*
  FROM erd.project p
  WHERE p.share_slug = p_share_slug
    AND p.visibility = 'public';
$$;

CREATE OR REPLACE FUNCTION api.fn_project_set_visibility(
  p_project_id uuid,
  p_visibility text,
  p_allow_anonymous_edit boolean
)
RETURNS erd.project
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_project erd.project;
BEGIN
  UPDATE erd.project p
  SET
    visibility = p_visibility,
    allow_anonymous_edit = p_allow_anonymous_edit,
    owner_user_id = COALESCE(p.owner_user_id, api.fn_current_user_uuid()),
    updated_by = api.fn_current_user_uuid()
  WHERE p.project_id = p_project_id
    AND api.fn_can_edit_project(p.project_id)
  RETURNING p.* INTO v_project;

  RETURN v_project;
END;
$$;

DROP FUNCTION IF EXISTS api.fn_diagram_get(uuid);

CREATE OR REPLACE FUNCTION api.fn_diagram_get(
  p_diagram_id uuid
)
RETURNS TABLE (
  diagram_id uuid,
  project_id uuid,
  workspace_id uuid,
  name text,
  description text,
  version_no bigint,
  viewport_x numeric,
  viewport_y numeric,
  viewport_zoom numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    d.diagram_id,
    d.project_id,
    d.workspace_id,
    d.name,
    d.description,
    d.version_no,
    d.viewport_x,
    d.viewport_y,
    d.viewport_zoom,
    d.created_at,
    d.updated_at
  FROM erd.diagram d
  WHERE d.diagram_id = p_diagram_id
    AND api.fn_can_read_diagram(d.diagram_id);
$$;

GRANT SELECT ON api.vw_projects TO app_anon, app_user, app_service;
GRANT SELECT ON api.vw_diagrams TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_project_create(uuid, text, text, text, boolean, text) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_project_get_by_share_slug(text) TO app_anon, app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_project_set_visibility(uuid, text, boolean) TO app_user, app_service;
GRANT EXECUTE ON FUNCTION api.fn_diagram_get(uuid) TO app_anon, app_user, app_service;
