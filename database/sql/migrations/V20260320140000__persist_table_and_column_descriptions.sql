ALTER TABLE erd.entity_table
ADD COLUMN IF NOT EXISTS comment_text text;

ALTER TABLE erd.entity_column
ADD COLUMN IF NOT EXISTS comment_text text;

DROP FUNCTION IF EXISTS api.fn_column_update(uuid, uuid, text, integer, text, text, boolean, text, boolean, boolean, text, text);
DROP FUNCTION IF EXISTS api.fn_column_create(uuid, text, integer, text, text, boolean, text, boolean, boolean, text, text);
DROP FUNCTION IF EXISTS api.fn_table_update(uuid, uuid, text, text, numeric, numeric, text, boolean, text);
DROP FUNCTION IF EXISTS api.fn_table_create(uuid, text, text, text, numeric, numeric, text, text);
DROP FUNCTION IF EXISTS api.fn_diagram_get_columns(uuid);
DROP FUNCTION IF EXISTS api.fn_diagram_get_tables(uuid);

CREATE OR REPLACE FUNCTION api.fn_diagram_get_tables(
  p_diagram_id uuid
)
RETURNS TABLE (
  table_id uuid,
  diagram_id uuid,
  schema_name text,
  table_name text,
  display_name text,
  comment_text text,
  pos_x numeric,
  pos_y numeric,
  width numeric,
  height numeric,
  color_hex text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    t.table_id,
    t.diagram_id,
    t.schema_name,
    t.table_name,
    t.display_name,
    t.comment_text,
    t.pos_x,
    t.pos_y,
    t.width,
    t.height,
    t.color_hex
  FROM erd.entity_table t
  WHERE t.diagram_id = p_diagram_id
    AND t.is_deleted = false
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY t.table_name;
$$;

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
    c.comment_text
  FROM erd.entity_column c
  JOIN erd.entity_table t ON t.table_id = c.table_id
  WHERE t.diagram_id = p_diagram_id
    AND t.is_deleted = false
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY c.table_id, c.ordinal_position;
$$;

CREATE OR REPLACE FUNCTION api.fn_table_create(
  p_diagram_id uuid,
  p_schema_name text,
  p_table_name text,
  p_display_name text,
  p_pos_x numeric,
  p_pos_y numeric,
  p_color_hex text,
  p_comment_text text DEFAULT NULL
)
RETURNS TABLE (
  table_id uuid,
  diagram_id uuid,
  schema_name text,
  table_name text,
  display_name text,
  comment_text text,
  pos_x numeric,
  pos_y numeric,
  color_hex text,
  is_deleted boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_diagram_id uuid;
  v_display_name text := COALESCE(NULLIF(btrim(p_display_name), ''), NULLIF(btrim(p_table_name), ''));
BEGIN
  SELECT d.diagram_id
  INTO v_diagram_id
  FROM erd.diagram d
  WHERE d.diagram_id = p_diagram_id;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to create table on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.entity_table (
    diagram_id,
    schema_name,
    table_name,
    display_name,
    comment_text,
    pos_x,
    pos_y,
    color_hex
  )
  VALUES (
    p_diagram_id,
    p_schema_name,
    p_table_name,
    v_display_name,
    NULLIF(btrim(p_comment_text), ''),
    p_pos_x,
    p_pos_y,
    p_color_hex
  )
  RETURNING
    erd.entity_table.table_id,
    erd.entity_table.diagram_id,
    erd.entity_table.schema_name,
    erd.entity_table.table_name,
    erd.entity_table.display_name,
    erd.entity_table.comment_text,
    erd.entity_table.pos_x,
    erd.entity_table.pos_y,
    erd.entity_table.color_hex,
    erd.entity_table.is_deleted,
    erd.entity_table.created_at,
    erd.entity_table.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_table_update(
  p_diagram_id uuid,
  p_table_id uuid,
  p_schema_name text,
  p_table_name text,
  p_pos_x numeric,
  p_pos_y numeric,
  p_color_hex text,
  p_is_deleted boolean,
  p_comment_text text DEFAULT NULL
)
RETURNS TABLE (
  table_id uuid,
  diagram_id uuid,
  schema_name text,
  table_name text,
  display_name text,
  comment_text text,
  pos_x numeric,
  pos_y numeric,
  color_hex text,
  is_deleted boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_table erd.entity_table%ROWTYPE;
  v_next_schema_name text;
  v_next_table_name text;
BEGIN
  SELECT *
  INTO v_table
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id
    AND t.diagram_id = p_diagram_id;

  IF NOT FOUND OR NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update table % on diagram %', p_table_id, p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  v_next_schema_name := COALESCE(NULLIF(btrim(p_schema_name), ''), v_table.schema_name);
  v_next_table_name := COALESCE(NULLIF(btrim(p_table_name), ''), v_table.table_name);

  IF EXISTS (
    SELECT 1
    FROM erd.entity_table t
    WHERE t.diagram_id = p_diagram_id
      AND t.table_id <> p_table_id
      AND t.schema_name = v_next_schema_name
      AND t.table_name = v_next_table_name
  ) THEN
    RAISE EXCEPTION 'table % already exists on diagram %', v_next_table_name, p_diagram_id
      USING ERRCODE = '23505';
  END IF;

  RETURN QUERY
  UPDATE erd.entity_table t
  SET
    schema_name = v_next_schema_name,
    table_name = v_next_table_name,
    display_name = v_next_table_name,
    comment_text = COALESCE(NULLIF(btrim(p_comment_text), ''), t.comment_text),
    pos_x = COALESCE(p_pos_x, t.pos_x),
    pos_y = COALESCE(p_pos_y, t.pos_y),
    color_hex = COALESCE(p_color_hex, t.color_hex),
    is_deleted = COALESCE(p_is_deleted, t.is_deleted)
  WHERE t.table_id = p_table_id
    AND t.diagram_id = p_diagram_id
  RETURNING
    t.table_id,
    t.diagram_id,
    t.schema_name,
    t.table_name,
    t.display_name,
    t.comment_text,
    t.pos_x,
    t.pos_y,
    t.color_hex,
    t.is_deleted,
    t.created_at,
    t.updated_at;
END;
$$;

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
    erd.entity_column.comment_text,
    erd.entity_column.created_at,
    erd.entity_column.updated_at;
END;
$$;

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
  v_next_data_type text;
  v_next_udt_name text;
  v_type_changed boolean := p_data_type IS NOT NULL OR p_udt_name IS NOT NULL;
BEGIN
  SELECT t.diagram_id
  INTO v_diagram_id
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update column on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_current_column
  FROM erd.entity_column c
  WHERE c.table_id = p_table_id
    AND c.column_id = p_column_id;

  v_next_data_type := COALESCE(p_data_type, v_current_column.data_type);
  v_next_udt_name := CASE
    WHEN p_data_type IS NULL THEN COALESCE(NULLIF(btrim(p_udt_name), ''), v_current_column.udt_name)
    WHEN replace(p_data_type, '[]', '') = 'USER-DEFINED' THEN
      COALESCE(NULLIF(btrim(p_udt_name), ''), v_current_column.udt_name)
    ELSE NULL
  END;

  IF v_type_changed AND replace(COALESCE(v_next_data_type, ''), '[]', '') = 'USER-DEFINED' THEN
    IF v_next_udt_name IS NULL THEN
      RAISE EXCEPTION 'udt_name is required for user-defined columns'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM erd.custom_type c
      WHERE c.diagram_id = v_diagram_id
        AND c.kind = 'enum'
        AND lower(c.type_name) = lower(v_next_udt_name)
    ) THEN
      RAISE EXCEPTION 'custom type % does not exist on diagram %', v_next_udt_name, v_diagram_id
        USING ERRCODE = '23503';
    END IF;
  END IF;

  RETURN QUERY
  UPDATE erd.entity_column c
  SET
    column_name = COALESCE(p_column_name, c.column_name),
    ordinal_position = COALESCE(p_ordinal_position, c.ordinal_position),
    data_type = COALESCE(p_data_type, c.data_type),
    udt_name = CASE
      WHEN p_data_type IS NULL THEN COALESCE(NULLIF(btrim(p_udt_name), ''), c.udt_name)
      WHEN replace(p_data_type, '[]', '') = 'USER-DEFINED' THEN
        COALESCE(NULLIF(btrim(p_udt_name), ''), c.udt_name)
      ELSE NULL
    END,
    is_nullable = COALESCE(p_is_nullable, c.is_nullable),
    default_sql = COALESCE(p_default_sql, c.default_sql),
    is_primary_key = COALESCE(p_is_primary_key, c.is_primary_key),
    is_unique = COALESCE(p_is_unique, c.is_unique),
    example_value = COALESCE(p_example_value, c.example_value),
    comment_text = COALESCE(NULLIF(btrim(p_comment_text), ''), c.comment_text)
  WHERE c.column_id = p_column_id
    AND c.table_id = p_table_id
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
    c.example_value,
    c.comment_text,
    c.created_at,
    c.updated_at;
END;
$$;
