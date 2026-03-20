DROP FUNCTION IF EXISTS api.fn_diagram_get_columns(uuid);

CREATE OR REPLACE FUNCTION api.fn_diagram_get_columns(
  p_diagram_id uuid
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
  example_value text,
  comment_text text
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
    c.is_unique,
    c.example_value,
    c.comment_text
  FROM erd.entity_column c
  JOIN erd.entity_table t ON t.table_id = c.table_id
  WHERE t.diagram_id = p_diagram_id
    AND t.is_deleted = false
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY c.table_id, c.ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION api.fn_diagram_get_columns(uuid)
TO app_anon, app_user, app_service;
