CREATE OR REPLACE FUNCTION api.fn_column_delete(
  p_table_id uuid,
  p_column_id uuid
)
RETURNS TABLE (
  column_id uuid,
  table_id uuid,
  column_name text,
  ordinal_position integer,
  data_type text,
  udt_name text,
  is_nullable boolean,
  default_sql text,
  is_primary_key boolean,
  is_unique boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_diagram_id uuid;
BEGIN
  SELECT t.diagram_id
  INTO v_diagram_id
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to delete column on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  DELETE FROM erd.entity_column c
  WHERE c.table_id = p_table_id
    AND c.column_id = p_column_id
  RETURNING
    c.column_id,
    c.table_id,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.default_sql,
    c.is_primary_key,
    c.is_unique,
    c.created_at,
    c.updated_at;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_column_delete(uuid, uuid)
TO app_anon, app_user, app_service;
