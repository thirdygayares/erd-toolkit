ALTER TABLE erd.entity_column
ADD COLUMN IF NOT EXISTS ui_width numeric;

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
  ui_width numeric,
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
    c.ui_width,
    c.comment_text
  FROM erd.entity_column c
  JOIN erd.entity_table t ON t.table_id = c.table_id
  WHERE t.diagram_id = p_diagram_id
    AND t.is_deleted = false
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY c.table_id, c.ordinal_position;
$$;

DROP FUNCTION IF EXISTS api.fn_column_create(uuid, text, integer, text, text, boolean, text, boolean, boolean, text, text);
DROP FUNCTION IF EXISTS api.fn_column_create(uuid, text, integer, text, text, boolean, text, boolean, boolean, text);
DROP FUNCTION IF EXISTS api.fn_column_create(uuid, text, integer, text, text, boolean, text, boolean, boolean);

CREATE OR REPLACE FUNCTION api.fn_column_create(
  p_table_id uuid,
  p_column_name text,
  p_ordinal_position integer,
  p_data_type text,
  p_udt_name text,
  p_is_nullable boolean,
  p_default_sql text,
  p_is_primary_key boolean,
  p_is_unique boolean,
  p_example_value text,
  p_ui_width numeric DEFAULT NULL,
  p_comment_text text DEFAULT NULL
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
  ui_width numeric,
  comment_text text,
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
    RAISE EXCEPTION 'forbidden to create column on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.entity_column (
    table_id,
    column_name,
    ordinal_position,
    data_type,
    udt_name,
    is_nullable,
    default_sql,
    is_primary_key,
    is_unique,
    example_value,
    ui_width,
    comment_text
  )
  VALUES (
    p_table_id,
    p_column_name,
    p_ordinal_position,
    p_data_type,
    p_udt_name,
    p_is_nullable,
    p_default_sql,
    p_is_primary_key,
    p_is_unique,
    p_example_value,
    p_ui_width,
    NULLIF(btrim(p_comment_text), '')
  )
  RETURNING
    erd.entity_column.column_id,
    erd.entity_column.table_id,
    erd.entity_column.column_name,
    erd.entity_column.ordinal_position,
    erd.entity_column.data_type,
    erd.entity_column.udt_name,
    erd.entity_column.is_nullable,
    erd.entity_column.default_sql,
    erd.entity_column.is_primary_key,
    erd.entity_column.is_unique,
    erd.entity_column.example_value,
    erd.entity_column.ui_width,
    erd.entity_column.comment_text,
    erd.entity_column.created_at,
    erd.entity_column.updated_at;
END;
$$;

DROP FUNCTION IF EXISTS api.fn_column_update(uuid, uuid, text, integer, text, text, boolean, text, boolean, boolean, text, text);
DROP FUNCTION IF EXISTS api.fn_column_update(uuid, uuid, text, integer, text, text, boolean, text, boolean, boolean, text);
DROP FUNCTION IF EXISTS api.fn_column_update(uuid, uuid, text, integer, text, text, boolean, text, boolean, boolean);

CREATE OR REPLACE FUNCTION api.fn_column_update(
  p_table_id uuid,
  p_column_id uuid,
  p_column_name text,
  p_ordinal_position integer,
  p_data_type text,
  p_udt_name text,
  p_is_nullable boolean,
  p_default_sql text,
  p_is_primary_key boolean,
  p_is_unique boolean,
  p_example_value text,
  p_ui_width numeric DEFAULT NULL,
  p_comment_text text DEFAULT NULL
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
  ui_width numeric,
  comment_text text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_diagram_id uuid;
  v_current_column erd.entity_column%ROWTYPE;
BEGIN
  SELECT t.diagram_id
  INTO v_diagram_id
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update column on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  SELECT c.*
  INTO v_current_column
  FROM erd.entity_column c
  WHERE c.column_id = p_column_id
    AND c.table_id = p_table_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_data_type IS NOT NULL THEN
    IF upper(replace(p_data_type, '[]', '')) <> 'USER-DEFINED' THEN
      p_udt_name := NULL;
    END IF;
  END IF;

  UPDATE erd.entity_column c
  SET
    column_name = COALESCE(p_column_name, c.column_name),
    ordinal_position = COALESCE(p_ordinal_position, c.ordinal_position),
    data_type = COALESCE(p_data_type, c.data_type),
    udt_name = COALESCE(p_udt_name, c.udt_name),
    is_nullable = COALESCE(p_is_nullable, c.is_nullable),
    default_sql = COALESCE(p_default_sql, c.default_sql),
    is_primary_key = COALESCE(p_is_primary_key, c.is_primary_key),
    is_unique = COALESCE(p_is_unique, c.is_unique),
    example_value = COALESCE(p_example_value, c.example_value),
    ui_width = COALESCE(p_ui_width, c.ui_width),
    comment_text = COALESCE(NULLIF(btrim(p_comment_text), ''), c.comment_text)
  WHERE c.column_id = p_column_id
    AND c.table_id = p_table_id;

  RETURN QUERY
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
    c.ui_width,
    c.comment_text,
    c.created_at,
    c.updated_at
  FROM erd.entity_column c
  WHERE c.column_id = p_column_id
    AND c.table_id = p_table_id;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_diagram_get_columns(uuid)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_column_create(
  uuid,
  text,
  integer,
  text,
  text,
  boolean,
  text,
  boolean,
  boolean,
  text,
  numeric,
  text
)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_column_update(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  boolean,
  text,
  boolean,
  boolean,
  text,
  numeric,
  text
)
TO app_anon, app_user, app_service;
