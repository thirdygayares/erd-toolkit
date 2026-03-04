CREATE OR REPLACE FUNCTION api.fn_export_get_tables_v2(
  p_diagram_id uuid
)
RETURNS TABLE (
  table_id uuid,
  schema_name text,
  table_name text,
  display_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    t.table_id,
    t.schema_name,
    t.table_name,
    t.display_name
  FROM erd.entity_table t
  WHERE t.diagram_id = p_diagram_id
    AND t.is_deleted = false
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY t.table_name;
$$;
