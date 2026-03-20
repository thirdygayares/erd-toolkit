CREATE OR REPLACE FUNCTION api.fn_table_create(
  p_diagram_id uuid,
  p_schema_name text,
  p_table_name text,
  p_display_name text,
  p_pos_x numeric,
  p_pos_y numeric,
  p_color_hex text
)
RETURNS TABLE (
  table_id uuid,
  diagram_id uuid,
  schema_name text,
  table_name text,
  display_name text,
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
  v_display_name text := COALESCE(NULLIF(btrim(p_display_name), ''), NULLIF(btrim(p_table_name), ''));
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to create table on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.entity_table (
    diagram_id,
    schema_name,
    table_name,
    display_name,
    pos_x,
    pos_y,
    color_hex
  )
  VALUES (
    p_diagram_id,
    p_schema_name,
    p_table_name,
    v_display_name,
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
  p_is_deleted boolean
)
RETURNS TABLE (
  table_id uuid,
  diagram_id uuid,
  schema_name text,
  table_name text,
  display_name text,
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
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update table on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_table
  FROM erd.entity_table t
  WHERE t.diagram_id = p_diagram_id
    AND t.table_id = p_table_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
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
    RAISE EXCEPTION 'table % already exists in schema % for diagram %', v_next_table_name, v_next_schema_name, p_diagram_id
      USING ERRCODE = '23505';
  END IF;

  RETURN QUERY
  UPDATE erd.entity_table t
  SET
    schema_name = v_next_schema_name,
    table_name = v_next_table_name,
    display_name = v_next_table_name,
    pos_x = COALESCE(p_pos_x, t.pos_x),
    pos_y = COALESCE(p_pos_y, t.pos_y),
    color_hex = COALESCE(p_color_hex, t.color_hex),
    is_deleted = COALESCE(p_is_deleted, t.is_deleted)
  WHERE t.diagram_id = p_diagram_id
    AND t.table_id = p_table_id
  RETURNING
    t.table_id,
    t.diagram_id,
    t.schema_name,
    t.table_name,
    t.display_name,
    t.pos_x,
    t.pos_y,
    t.color_hex,
    t.is_deleted,
    t.created_at,
    t.updated_at;
END;
$$;
