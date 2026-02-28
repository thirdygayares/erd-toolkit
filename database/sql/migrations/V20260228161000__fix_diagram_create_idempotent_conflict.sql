CREATE OR REPLACE FUNCTION api.fn_diagram_create(
  p_workspace_id uuid,
  p_project_id uuid,
  p_name text,
  p_description text,
  p_actor_id uuid
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_project(p_project_id) THEN
    RAISE EXCEPTION 'forbidden to create diagram for project %', p_project_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO erd.diagram (
      workspace_id,
      project_id,
      name,
      description,
      created_by,
      updated_by
    )
    VALUES (
      p_workspace_id,
      p_project_id,
      p_name,
      p_description,
      p_actor_id,
      p_actor_id
    )
    ON CONFLICT ON CONSTRAINT diagram_workspace_name_unq DO NOTHING
    RETURNING
      erd.diagram.diagram_id,
      erd.diagram.workspace_id,
      erd.diagram.project_id,
      erd.diagram.name,
      erd.diagram.description,
      erd.diagram.version_no,
      erd.diagram.viewport_x,
      erd.diagram.viewport_y,
      erd.diagram.viewport_zoom,
      erd.diagram.created_at,
      erd.diagram.updated_at
  )
  SELECT
    inserted.diagram_id,
    inserted.workspace_id,
    inserted.project_id,
    inserted.name,
    inserted.description,
    inserted.version_no,
    inserted.viewport_x,
    inserted.viewport_y,
    inserted.viewport_zoom,
    inserted.created_at,
    inserted.updated_at
  FROM inserted
  UNION ALL
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
  WHERE d.project_id = p_project_id
    AND d.name = p_name
    AND NOT EXISTS (SELECT 1 FROM inserted)
  LIMIT 1;
END;
$$;

