CREATE OR REPLACE FUNCTION api.fn_export_get_columns_v2(
  p_table_id uuid
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
  is_unique boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    c.column_id,
    c.table_id,
    c.column_name,
    c.ordinal_position,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.default_sql,
    c.is_primary_key,
    c.is_unique
  FROM erd.entity_column c
  JOIN erd.entity_table t ON t.table_id = c.table_id
  WHERE c.table_id = p_table_id
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY c.ordinal_position;
$$;
