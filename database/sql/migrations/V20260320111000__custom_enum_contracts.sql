DROP FUNCTION IF EXISTS api.fn_diagram_get_custom_types(uuid);
CREATE OR REPLACE FUNCTION api.fn_diagram_get_custom_types(
  p_diagram_id uuid
)
RETURNS TABLE (
  custom_type_id uuid,
  diagram_id uuid,
  schema_name text,
  type_name text,
  kind text,
  enum_values text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    c.custom_type_id,
    c.diagram_id,
    c.schema_name,
    c.type_name,
    c.kind,
    COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(c.definition_json->'values', '[]'::jsonb))
      ),
      ARRAY[]::text[]
    ) AS enum_values,
    c.created_at,
    c.updated_at
  FROM erd.custom_type c
  WHERE c.diagram_id = p_diagram_id
    AND c.kind = 'enum'
    AND api.fn_can_read_diagram(c.diagram_id)
  ORDER BY c.schema_name, c.type_name;
$$;

DROP FUNCTION IF EXISTS api.fn_custom_type_create(uuid, text, text, text[]);
CREATE OR REPLACE FUNCTION api.fn_custom_type_create(
  p_diagram_id uuid,
  p_schema_name text,
  p_type_name text,
  p_enum_values text[]
)
RETURNS TABLE (
  custom_type_id uuid,
  diagram_id uuid,
  schema_name text,
  type_name text,
  kind text,
  enum_values text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_schema_name text := COALESCE(NULLIF(btrim(p_schema_name), ''), 'public');
  v_type_name text := NULLIF(btrim(p_type_name), '');
  v_enum_values text[];
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to create custom type on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  IF v_type_name IS NULL THEN
    RAISE EXCEPTION 'custom type name is required'
      USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(array_agg(value ORDER BY ordinality), ARRAY[]::text[])
  INTO v_enum_values
  FROM (
    SELECT
      btrim(value) AS value,
      ordinality
    FROM unnest(COALESCE(p_enum_values, ARRAY[]::text[])) WITH ORDINALITY AS items(value, ordinality)
  ) normalized;

  IF COALESCE(array_length(v_enum_values, 1), 0) = 0 THEN
    RAISE EXCEPTION 'enum values are required'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_enum_values) AS value
    WHERE value = ''
  ) THEN
    RAISE EXCEPTION 'enum values must not be blank'
      USING ERRCODE = '23514';
  END IF;

  IF (
    SELECT count(*) FROM unnest(v_enum_values) AS value
  ) <> (
    SELECT count(DISTINCT value) FROM unnest(v_enum_values) AS value
  ) THEN
    RAISE EXCEPTION 'enum values must be unique'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM erd.custom_type c
    WHERE c.diagram_id = p_diagram_id
      AND c.kind = 'enum'
      AND lower(c.type_name) = lower(v_type_name)
  ) THEN
    RAISE EXCEPTION 'custom type % already exists on diagram %', v_type_name, p_diagram_id
      USING ERRCODE = '23505';
  END IF;

  RETURN QUERY
  WITH inserted AS (
    INSERT INTO erd.custom_type (
      diagram_id,
      schema_name,
      type_name,
      kind,
      definition_json
    )
    VALUES (
      p_diagram_id,
      v_schema_name,
      v_type_name,
      'enum',
      jsonb_build_object('values', to_jsonb(v_enum_values))
    )
    RETURNING *
  )
  SELECT
    inserted.custom_type_id,
    inserted.diagram_id,
    inserted.schema_name,
    inserted.type_name,
    inserted.kind,
    v_enum_values,
    inserted.created_at,
    inserted.updated_at
  FROM inserted;
END;
$$;

DROP FUNCTION IF EXISTS api.fn_custom_type_update(uuid, uuid, text, text, text[]);
CREATE OR REPLACE FUNCTION api.fn_custom_type_update(
  p_diagram_id uuid,
  p_custom_type_id uuid,
  p_schema_name text,
  p_type_name text,
  p_enum_values text[]
)
RETURNS TABLE (
  custom_type_id uuid,
  diagram_id uuid,
  schema_name text,
  type_name text,
  kind text,
  enum_values text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_custom_type erd.custom_type%ROWTYPE;
  v_next_schema_name text;
  v_next_type_name text;
  v_next_enum_values text[];
BEGIN
  SELECT *
  INTO v_custom_type
  FROM erd.custom_type c
  WHERE c.diagram_id = p_diagram_id
    AND c.custom_type_id = p_custom_type_id
    AND c.kind = 'enum'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT api.fn_can_edit_diagram(v_custom_type.diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update custom type % on diagram %', p_custom_type_id, p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  v_next_schema_name := COALESCE(NULLIF(btrim(p_schema_name), ''), v_custom_type.schema_name);
  v_next_type_name := COALESCE(NULLIF(btrim(p_type_name), ''), v_custom_type.type_name);

  IF p_enum_values IS NULL THEN
    SELECT COALESCE(
      ARRAY(
        SELECT jsonb_array_elements_text(COALESCE(v_custom_type.definition_json->'values', '[]'::jsonb))
      ),
      ARRAY[]::text[]
    )
    INTO v_next_enum_values;
  ELSE
    SELECT COALESCE(array_agg(value ORDER BY ordinality), ARRAY[]::text[])
    INTO v_next_enum_values
    FROM (
      SELECT
        btrim(value) AS value,
        ordinality
      FROM unnest(p_enum_values) WITH ORDINALITY AS items(value, ordinality)
    ) normalized;
  END IF;

  IF v_next_type_name IS NULL THEN
    RAISE EXCEPTION 'custom type name is required'
      USING ERRCODE = '23514';
  END IF;

  IF COALESCE(array_length(v_next_enum_values, 1), 0) = 0 THEN
    RAISE EXCEPTION 'enum values are required'
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(v_next_enum_values) AS value
    WHERE value = ''
  ) THEN
    RAISE EXCEPTION 'enum values must not be blank'
      USING ERRCODE = '23514';
  END IF;

  IF (
    SELECT count(*) FROM unnest(v_next_enum_values) AS value
  ) <> (
    SELECT count(DISTINCT value) FROM unnest(v_next_enum_values) AS value
  ) THEN
    RAISE EXCEPTION 'enum values must be unique'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM erd.custom_type c
    WHERE c.diagram_id = p_diagram_id
      AND c.kind = 'enum'
      AND c.custom_type_id <> p_custom_type_id
      AND lower(c.type_name) = lower(v_next_type_name)
  ) THEN
    RAISE EXCEPTION 'custom type % already exists on diagram %', v_next_type_name, p_diagram_id
      USING ERRCODE = '23505';
  END IF;

  IF v_custom_type.type_name IS DISTINCT FROM v_next_type_name THEN
    UPDATE erd.entity_column c
    SET udt_name = v_next_type_name
    FROM erd.entity_table t
    WHERE c.table_id = t.table_id
      AND t.diagram_id = p_diagram_id
      AND replace(c.data_type, '[]', '') = 'USER-DEFINED'
      AND c.udt_name = v_custom_type.type_name;
  END IF;

  RETURN QUERY
  WITH updated AS (
    UPDATE erd.custom_type c
    SET
      schema_name = v_next_schema_name,
      type_name = v_next_type_name,
      definition_json = jsonb_build_object('values', to_jsonb(v_next_enum_values))
    WHERE c.custom_type_id = p_custom_type_id
      AND c.diagram_id = p_diagram_id
      AND c.kind = 'enum'
    RETURNING *
  )
  SELECT
    updated.custom_type_id,
    updated.diagram_id,
    updated.schema_name,
    updated.type_name,
    updated.kind,
    v_next_enum_values,
    updated.created_at,
    updated.updated_at
  FROM updated;
END;
$$;

DROP FUNCTION IF EXISTS api.fn_custom_type_delete(uuid, uuid);
CREATE OR REPLACE FUNCTION api.fn_custom_type_delete(
  p_diagram_id uuid,
  p_custom_type_id uuid
)
RETURNS TABLE (
  custom_type_id uuid,
  diagram_id uuid,
  schema_name text,
  type_name text,
  kind text,
  enum_values text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_custom_type erd.custom_type%ROWTYPE;
  v_enum_values text[];
BEGIN
  SELECT *
  INTO v_custom_type
  FROM erd.custom_type c
  WHERE c.diagram_id = p_diagram_id
    AND c.custom_type_id = p_custom_type_id
    AND c.kind = 'enum'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF NOT api.fn_can_edit_diagram(v_custom_type.diagram_id) THEN
    RAISE EXCEPTION 'forbidden to delete custom type % on diagram %', p_custom_type_id, p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM erd.entity_column c
    JOIN erd.entity_table t ON t.table_id = c.table_id
    WHERE t.diagram_id = p_diagram_id
      AND replace(c.data_type, '[]', '') = 'USER-DEFINED'
      AND c.udt_name = v_custom_type.type_name
  ) THEN
    RAISE EXCEPTION 'cannot delete custom type % because columns still use it', v_custom_type.type_name
      USING ERRCODE = '2BP01';
  END IF;

  SELECT COALESCE(
    ARRAY(
      SELECT jsonb_array_elements_text(COALESCE(v_custom_type.definition_json->'values', '[]'::jsonb))
    ),
    ARRAY[]::text[]
  )
  INTO v_enum_values;

  RETURN QUERY
  WITH deleted AS (
    DELETE FROM erd.custom_type c
    WHERE c.custom_type_id = p_custom_type_id
      AND c.diagram_id = p_diagram_id
      AND c.kind = 'enum'
    RETURNING *
  )
  SELECT
    deleted.custom_type_id,
    deleted.diagram_id,
    deleted.schema_name,
    deleted.type_name,
    deleted.kind,
    v_enum_values,
    deleted.created_at,
    deleted.updated_at
  FROM deleted;
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
  p_example_value text
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
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_diagram_id uuid;
  v_is_user_defined boolean := replace(COALESCE(p_data_type, ''), '[]', '') = 'USER-DEFINED';
  v_udt_name text := NULLIF(btrim(p_udt_name), '');
BEGIN
  SELECT t.diagram_id
  INTO v_diagram_id
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to create column on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  IF v_is_user_defined THEN
    IF v_udt_name IS NULL THEN
      RAISE EXCEPTION 'udt_name is required for user-defined columns'
        USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM erd.custom_type c
      WHERE c.diagram_id = v_diagram_id
        AND c.kind = 'enum'
        AND lower(c.type_name) = lower(v_udt_name)
    ) THEN
      RAISE EXCEPTION 'custom type % does not exist on diagram %', v_udt_name, v_diagram_id
        USING ERRCODE = '23503';
    END IF;
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
    example_value
  )
  VALUES (
    p_table_id,
    p_column_name,
    p_ordinal_position,
    p_data_type,
    CASE WHEN v_is_user_defined THEN v_udt_name ELSE NULL END,
    p_is_nullable,
    p_default_sql,
    p_is_primary_key,
    p_is_unique,
    p_example_value
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
  p_example_value text
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
    example_value = COALESCE(p_example_value, c.example_value)
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
    c.created_at,
    c.updated_at;
END;
$$;
