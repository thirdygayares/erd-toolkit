CREATE OR REPLACE FUNCTION api.fn_relationship_update(
  p_diagram_id uuid,
  p_relationship_id uuid,
  p_name text,
  p_from_table_id uuid,
  p_from_column_id uuid,
  p_to_table_id uuid,
  p_to_column_id uuid,
  p_cardinality_from text,
  p_cardinality_to text,
  p_on_update_action text,
  p_on_delete_action text,
  p_is_identifying boolean
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
DECLARE
  v_from_table_id uuid;
  v_from_column_id uuid;
  v_to_table_id uuid;
  v_to_column_id uuid;
  v_from_type text;
  v_to_type text;
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update relationship on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  SELECT
    r.from_table_id,
    r.from_column_id,
    r.to_table_id,
    r.to_column_id
  INTO
    v_from_table_id,
    v_from_column_id,
    v_to_table_id,
    v_to_column_id
  FROM erd.entity_relationship r
  WHERE r.diagram_id = p_diagram_id
    AND r.relationship_id = p_relationship_id;

  IF v_from_table_id IS NULL THEN
    RETURN;
  END IF;

  v_from_table_id := COALESCE(p_from_table_id, v_from_table_id);
  v_from_column_id := COALESCE(p_from_column_id, v_from_column_id);
  v_to_table_id := COALESCE(p_to_table_id, v_to_table_id);
  v_to_column_id := COALESCE(p_to_column_id, v_to_column_id);

  SELECT c.data_type
  INTO v_from_type
  FROM erd.entity_column c
  WHERE c.column_id = v_from_column_id
    AND c.table_id = v_from_table_id;

  SELECT c.data_type
  INTO v_to_type
  FROM erd.entity_column c
  WHERE c.column_id = v_to_column_id
    AND c.table_id = v_to_table_id;

  IF v_from_type IS NULL OR v_to_type IS NULL THEN
    RAISE EXCEPTION 'invalid relationship endpoints'
      USING ERRCODE = '22023';
  END IF;

  IF lower(v_from_type) <> lower(v_to_type) THEN
    RAISE EXCEPTION 'relationship column types must match: % vs %', v_from_type, v_to_type
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  UPDATE erd.entity_relationship r
  SET
    name = COALESCE(p_name, r.name),
    from_table_id = v_from_table_id,
    from_column_id = v_from_column_id,
    to_table_id = v_to_table_id,
    to_column_id = v_to_column_id,
    cardinality_from = COALESCE(p_cardinality_from, r.cardinality_from),
    cardinality_to = COALESCE(p_cardinality_to, r.cardinality_to),
    on_update_action = COALESCE(p_on_update_action, r.on_update_action),
    on_delete_action = COALESCE(p_on_delete_action, r.on_delete_action),
    is_identifying = COALESCE(p_is_identifying, r.is_identifying)
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

