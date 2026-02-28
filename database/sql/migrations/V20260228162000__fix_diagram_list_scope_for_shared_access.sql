CREATE OR REPLACE FUNCTION api.fn_diagram_list_by_workspace(
  p_workspace_id uuid
)
RETURNS TABLE (
  diagram_id uuid,
  workspace_id uuid,
  project_id uuid,
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
    d.workspace_id,
    d.project_id,
    d.name,
    d.description,
    d.version_no,
    d.viewport_x,
    d.viewport_y,
    d.viewport_zoom,
    d.created_at,
    d.updated_at
  FROM erd.diagram d
  WHERE d.workspace_id = p_workspace_id
    AND api.fn_can_read_project(d.project_id)
  ORDER BY d.created_at DESC;
$$;

