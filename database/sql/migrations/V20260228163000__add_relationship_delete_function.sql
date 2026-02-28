CREATE OR REPLACE FUNCTION api.fn_relationship_delete(
  p_diagram_id uuid,
  p_relationship_id uuid
)
RETURNS TABLE (
  relationship_id uuid,
  diagram_id uuid,
  name text,
  from_table_id uuid,
  from_column_id uuid,
  to_table_id uuid,
  to_column_id uuid,
  cardinality_from text,
  cardinality_to text,
  on_update_action text,
  on_delete_action text,
  is_identifying boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to delete relationship on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  DELETE FROM erd.entity_relationship r
  WHERE r.diagram_id = p_diagram_id
    AND r.relationship_id = p_relationship_id
  RETURNING
    r.relationship_id,
    r.diagram_id,
    r.name,
    r.from_table_id,
    r.from_column_id,
    r.to_table_id,
    r.to_column_id,
    r.cardinality_from,
    r.cardinality_to,
    r.on_update_action,
    r.on_delete_action,
    r.is_identifying,
    r.created_at,
    r.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_relationship_delete(uuid, uuid)
TO app_anon, app_user, app_service;

