ALTER TABLE erd.entity_index
ADD COLUMN IF NOT EXISTS comment_text text;

ALTER TABLE erd.entity_index
ADD COLUMN IF NOT EXISTS source text;

UPDATE erd.entity_index
SET source = 'user'
WHERE source IS NULL;

ALTER TABLE erd.entity_index
ALTER COLUMN source SET DEFAULT 'user';

ALTER TABLE erd.entity_index
ALTER COLUMN source SET NOT NULL;

ALTER TABLE erd.entity_index
DROP CONSTRAINT IF EXISTS entity_index_source_ck;

ALTER TABLE erd.entity_index
ADD CONSTRAINT entity_index_source_ck
CHECK (source IN ('user', 'system_pk', 'system_unique_constraint'));

CREATE OR REPLACE FUNCTION api.fn_diagram_get_indexes(
  p_diagram_id uuid
)
RETURNS TABLE (
  index_id text,
  table_id uuid,
  index_name text,
  method text,
  is_unique boolean,
  comment_text text,
  source text,
  column_ids uuid[],
  column_names text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  WITH table_scope AS (
    SELECT
      t.table_id,
      t.table_name,
      t.diagram_id
    FROM erd.entity_table t
    WHERE t.diagram_id = p_diagram_id
      AND t.is_deleted = false
      AND api.fn_can_read_diagram(t.diagram_id)
  ),
  user_indexes AS (
    SELECT
      i.index_id::text AS index_id,
      i.table_id,
      i.index_name,
      lower(i.method) AS method,
      i.is_unique,
      i.comment_text,
      COALESCE(i.source, 'user') AS source,
      COALESCE(array_agg(ic.column_id ORDER BY ic.ordinal_position), ARRAY[]::uuid[]) AS column_ids,
      COALESCE(array_agg(c.column_name ORDER BY ic.ordinal_position), ARRAY[]::text[]) AS column_names
    FROM erd.entity_index i
    JOIN table_scope ts ON ts.table_id = i.table_id
    LEFT JOIN erd.entity_index_column ic ON ic.index_id = i.index_id
    LEFT JOIN erd.entity_column c ON c.column_id = ic.column_id
    GROUP BY i.index_id, i.table_id, i.index_name, i.method, i.is_unique, i.comment_text, i.source
  ),
  system_pk AS (
    SELECT
      ('system_pk:' || ts.table_id::text) AS index_id,
      ts.table_id,
      (ts.table_name || '_pkey')::text AS index_name,
      'btree'::text AS method,
      true AS is_unique,
      'Primary key index'::text AS comment_text,
      'system_pk'::text AS source,
      array_agg(c.column_id ORDER BY c.ordinal_position) AS column_ids,
      array_agg(c.column_name ORDER BY c.ordinal_position) AS column_names
    FROM table_scope ts
    JOIN erd.entity_column c
      ON c.table_id = ts.table_id
     AND c.is_primary_key = true
    GROUP BY ts.table_id, ts.table_name
  ),
  system_unique AS (
    SELECT
      ('system_unique:' || c.column_id::text) AS index_id,
      ts.table_id,
      (ts.table_name || '_' || c.column_name || '_key')::text AS index_name,
      'btree'::text AS method,
      true AS is_unique,
      'Unique column index'::text AS comment_text,
      'system_unique_constraint'::text AS source,
      ARRAY[c.column_id]::uuid[] AS column_ids,
      ARRAY[c.column_name]::text[] AS column_names
    FROM table_scope ts
    JOIN erd.entity_column c
      ON c.table_id = ts.table_id
     AND c.is_unique = true
     AND c.is_primary_key = false
  )
  SELECT *
  FROM user_indexes
  UNION ALL
  SELECT *
  FROM system_pk
  UNION ALL
  SELECT *
  FROM system_unique
  ORDER BY table_id, source, index_name;
$$;

CREATE OR REPLACE FUNCTION api.fn_export_get_indexes_v1(
  p_table_id uuid
)
RETURNS TABLE (
  index_id uuid,
  table_id uuid,
  index_name text,
  method text,
  is_unique boolean,
  comment_text text,
  source text,
  column_ids uuid[],
  column_names text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    i.index_id,
    i.table_id,
    i.index_name,
    lower(i.method) AS method,
    i.is_unique,
    i.comment_text,
    COALESCE(i.source, 'user') AS source,
    COALESCE(array_agg(ic.column_id ORDER BY ic.ordinal_position), ARRAY[]::uuid[]) AS column_ids,
    COALESCE(array_agg(c.column_name ORDER BY ic.ordinal_position), ARRAY[]::text[]) AS column_names
  FROM erd.entity_index i
  JOIN erd.entity_table t ON t.table_id = i.table_id
  LEFT JOIN erd.entity_index_column ic ON ic.index_id = i.index_id
  LEFT JOIN erd.entity_column c ON c.column_id = ic.column_id
  WHERE i.table_id = p_table_id
    AND t.is_deleted = false
    AND COALESCE(i.source, 'user') = 'user'
    AND api.fn_can_read_diagram(t.diagram_id)
  GROUP BY i.index_id, i.table_id, i.index_name, i.method, i.is_unique, i.comment_text, i.source
  ORDER BY i.index_name;
$$;

CREATE OR REPLACE FUNCTION api.fn_index_create(
  p_table_id uuid,
  p_index_name text,
  p_method text DEFAULT 'btree',
  p_is_unique boolean DEFAULT false,
  p_comment_text text DEFAULT NULL,
  p_column_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS TABLE (
  index_id text,
  table_id uuid,
  index_name text,
  method text,
  is_unique boolean,
  comment_text text,
  source text,
  column_ids uuid[],
  column_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_diagram_id uuid;
  v_index_id uuid;
  v_index_name text := NULLIF(btrim(p_index_name), '');
  v_method text := lower(COALESCE(NULLIF(btrim(p_method), ''), 'btree'));
  v_column_count integer := COALESCE(array_length(p_column_ids, 1), 0);
  v_resolved_count integer;
  v_distinct_count integer;
  v_signature uuid[];
  v_pk_signature uuid[];
BEGIN
  SELECT t.diagram_id
  INTO v_diagram_id
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id
    AND t.is_deleted = false;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to create index on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  IF v_index_name IS NULL THEN
    RAISE EXCEPTION 'INDEX_NAME_REQUIRED'
      USING ERRCODE = '23514';
  END IF;

  IF v_column_count = 0 THEN
    RAISE EXCEPTION 'INDEX_COLUMN_REQUIRED'
      USING ERRCODE = '23514';
  END IF;

  IF v_method NOT IN ('btree', 'hash', 'gin', 'gist', 'brin', 'spgist') THEN
    RAISE EXCEPTION 'INDEX_TYPE_UNSUPPORTED'
      USING ERRCODE = '23514';
  END IF;

  SELECT
    COUNT(*),
    COUNT(DISTINCT u.column_id)
  INTO v_resolved_count, v_distinct_count
  FROM unnest(p_column_ids) AS u(column_id)
  JOIN erd.entity_column c
    ON c.column_id = u.column_id
   AND c.table_id = p_table_id;

  IF v_resolved_count <> v_column_count THEN
    RAISE EXCEPTION 'INDEX_COLUMN_NOT_FOUND'
      USING ERRCODE = '23503';
  END IF;

  IF v_distinct_count <> v_column_count THEN
    RAISE EXCEPTION 'INDEX_COLUMN_DUPLICATE'
      USING ERRCODE = '23514';
  END IF;

  SELECT array_agg(u.column_id ORDER BY u.ordinality)
  INTO v_signature
  FROM unnest(p_column_ids) WITH ORDINALITY AS u(column_id, ordinality);

  IF EXISTS (
    SELECT 1
    FROM erd.entity_index i
    WHERE i.table_id = p_table_id
      AND lower(i.index_name) = lower(v_index_name)
  ) THEN
    RAISE EXCEPTION 'INDEX_NAME_CONFLICT'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        i.index_id,
        lower(i.method) AS method,
        i.is_unique,
        COALESCE(array_agg(ic.column_id ORDER BY ic.ordinal_position), ARRAY[]::uuid[]) AS signature
      FROM erd.entity_index i
      LEFT JOIN erd.entity_index_column ic ON ic.index_id = i.index_id
      WHERE i.table_id = p_table_id
      GROUP BY i.index_id, i.method, i.is_unique
    ) existing
    WHERE existing.signature = v_signature
      AND existing.method = v_method
      AND existing.is_unique = p_is_unique
  ) THEN
    RAISE EXCEPTION 'INDEX_SIGNATURE_DUPLICATE'
      USING ERRCODE = '23514';
  END IF;

  IF p_is_unique = true AND v_method = 'btree' THEN
    SELECT array_agg(c.column_id ORDER BY c.ordinal_position)
    INTO v_pk_signature
    FROM erd.entity_column c
    WHERE c.table_id = p_table_id
      AND c.is_primary_key = true;

    IF v_pk_signature IS NOT NULL AND v_pk_signature = v_signature THEN
      RAISE EXCEPTION 'INDEX_SIGNATURE_DUPLICATE'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM erd.entity_column c
      WHERE c.table_id = p_table_id
        AND c.is_unique = true
        AND c.is_primary_key = false
        AND ARRAY[c.column_id]::uuid[] = v_signature
    ) THEN
      RAISE EXCEPTION 'INDEX_SIGNATURE_DUPLICATE'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  INSERT INTO erd.entity_index (
    table_id,
    index_name,
    method,
    is_unique,
    is_primary,
    comment_text,
    source
  )
  VALUES (
    p_table_id,
    v_index_name,
    v_method,
    p_is_unique,
    false,
    NULLIF(btrim(p_comment_text), ''),
    'user'
  )
  RETURNING erd.entity_index.index_id
  INTO v_index_id;

  INSERT INTO erd.entity_index_column (
    index_id,
    column_id,
    ordinal_position,
    sort_direction
  )
  SELECT
    v_index_id,
    u.column_id,
    u.ordinality,
    'ASC'
  FROM unnest(p_column_ids) WITH ORDINALITY AS u(column_id, ordinality);

  RETURN QUERY
  SELECT
    i.index_id::text,
    i.table_id,
    i.index_name,
    lower(i.method) AS method,
    i.is_unique,
    i.comment_text,
    COALESCE(i.source, 'user') AS source,
    COALESCE(array_agg(ic.column_id ORDER BY ic.ordinal_position), ARRAY[]::uuid[]) AS column_ids,
    COALESCE(array_agg(c.column_name ORDER BY ic.ordinal_position), ARRAY[]::text[]) AS column_names
  FROM erd.entity_index i
  LEFT JOIN erd.entity_index_column ic ON ic.index_id = i.index_id
  LEFT JOIN erd.entity_column c ON c.column_id = ic.column_id
  WHERE i.index_id = v_index_id
  GROUP BY i.index_id, i.table_id, i.index_name, i.method, i.is_unique, i.comment_text, i.source;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_index_update(
  p_table_id uuid,
  p_index_id uuid,
  p_index_name text,
  p_method text DEFAULT 'btree',
  p_is_unique boolean DEFAULT false,
  p_comment_text text DEFAULT NULL,
  p_column_ids uuid[] DEFAULT ARRAY[]::uuid[]
)
RETURNS TABLE (
  index_id text,
  table_id uuid,
  index_name text,
  method text,
  is_unique boolean,
  comment_text text,
  source text,
  column_ids uuid[],
  column_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_diagram_id uuid;
  v_current erd.entity_index%ROWTYPE;
  v_index_name text := NULLIF(btrim(p_index_name), '');
  v_method text := lower(COALESCE(NULLIF(btrim(p_method), ''), 'btree'));
  v_column_count integer := COALESCE(array_length(p_column_ids, 1), 0);
  v_resolved_count integer;
  v_distinct_count integer;
  v_signature uuid[];
  v_pk_signature uuid[];
BEGIN
  SELECT t.diagram_id
  INTO v_diagram_id
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id
    AND t.is_deleted = false;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update index on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_current
  FROM erd.entity_index i
  WHERE i.table_id = p_table_id
    AND i.index_id = p_index_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF COALESCE(v_current.source, 'user') <> 'user' THEN
    RAISE EXCEPTION 'INDEX_SYSTEM_LOCKED'
      USING ERRCODE = '42501';
  END IF;

  IF v_index_name IS NULL THEN
    RAISE EXCEPTION 'INDEX_NAME_REQUIRED'
      USING ERRCODE = '23514';
  END IF;

  IF v_column_count = 0 THEN
    RAISE EXCEPTION 'INDEX_COLUMN_REQUIRED'
      USING ERRCODE = '23514';
  END IF;

  IF v_method NOT IN ('btree', 'hash', 'gin', 'gist', 'brin', 'spgist') THEN
    RAISE EXCEPTION 'INDEX_TYPE_UNSUPPORTED'
      USING ERRCODE = '23514';
  END IF;

  SELECT
    COUNT(*),
    COUNT(DISTINCT u.column_id)
  INTO v_resolved_count, v_distinct_count
  FROM unnest(p_column_ids) AS u(column_id)
  JOIN erd.entity_column c
    ON c.column_id = u.column_id
   AND c.table_id = p_table_id;

  IF v_resolved_count <> v_column_count THEN
    RAISE EXCEPTION 'INDEX_COLUMN_NOT_FOUND'
      USING ERRCODE = '23503';
  END IF;

  IF v_distinct_count <> v_column_count THEN
    RAISE EXCEPTION 'INDEX_COLUMN_DUPLICATE'
      USING ERRCODE = '23514';
  END IF;

  SELECT array_agg(u.column_id ORDER BY u.ordinality)
  INTO v_signature
  FROM unnest(p_column_ids) WITH ORDINALITY AS u(column_id, ordinality);

  IF EXISTS (
    SELECT 1
    FROM erd.entity_index i
    WHERE i.table_id = p_table_id
      AND i.index_id <> p_index_id
      AND lower(i.index_name) = lower(v_index_name)
  ) THEN
    RAISE EXCEPTION 'INDEX_NAME_CONFLICT'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        i.index_id,
        lower(i.method) AS method,
        i.is_unique,
        COALESCE(array_agg(ic.column_id ORDER BY ic.ordinal_position), ARRAY[]::uuid[]) AS signature
      FROM erd.entity_index i
      LEFT JOIN erd.entity_index_column ic ON ic.index_id = i.index_id
      WHERE i.table_id = p_table_id
        AND i.index_id <> p_index_id
      GROUP BY i.index_id, i.method, i.is_unique
    ) existing
    WHERE existing.signature = v_signature
      AND existing.method = v_method
      AND existing.is_unique = p_is_unique
  ) THEN
    RAISE EXCEPTION 'INDEX_SIGNATURE_DUPLICATE'
      USING ERRCODE = '23514';
  END IF;

  IF p_is_unique = true AND v_method = 'btree' THEN
    SELECT array_agg(c.column_id ORDER BY c.ordinal_position)
    INTO v_pk_signature
    FROM erd.entity_column c
    WHERE c.table_id = p_table_id
      AND c.is_primary_key = true;

    IF v_pk_signature IS NOT NULL AND v_pk_signature = v_signature THEN
      RAISE EXCEPTION 'INDEX_SIGNATURE_DUPLICATE'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM erd.entity_column c
      WHERE c.table_id = p_table_id
        AND c.is_unique = true
        AND c.is_primary_key = false
        AND ARRAY[c.column_id]::uuid[] = v_signature
    ) THEN
      RAISE EXCEPTION 'INDEX_SIGNATURE_DUPLICATE'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  UPDATE erd.entity_index i
  SET
    index_name = v_index_name,
    method = v_method,
    is_unique = p_is_unique,
    comment_text = NULLIF(btrim(p_comment_text), '')
  WHERE i.index_id = p_index_id
    AND i.table_id = p_table_id;

  DELETE FROM erd.entity_index_column ic
  WHERE ic.index_id = p_index_id;

  INSERT INTO erd.entity_index_column (
    index_id,
    column_id,
    ordinal_position,
    sort_direction
  )
  SELECT
    p_index_id,
    u.column_id,
    u.ordinality,
    'ASC'
  FROM unnest(p_column_ids) WITH ORDINALITY AS u(column_id, ordinality);

  RETURN QUERY
  SELECT
    i.index_id::text,
    i.table_id,
    i.index_name,
    lower(i.method) AS method,
    i.is_unique,
    i.comment_text,
    COALESCE(i.source, 'user') AS source,
    COALESCE(array_agg(ic.column_id ORDER BY ic.ordinal_position), ARRAY[]::uuid[]) AS column_ids,
    COALESCE(array_agg(c.column_name ORDER BY ic.ordinal_position), ARRAY[]::text[]) AS column_names
  FROM erd.entity_index i
  LEFT JOIN erd.entity_index_column ic ON ic.index_id = i.index_id
  LEFT JOIN erd.entity_column c ON c.column_id = ic.column_id
  WHERE i.index_id = p_index_id
  GROUP BY i.index_id, i.table_id, i.index_name, i.method, i.is_unique, i.comment_text, i.source;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_index_delete(
  p_table_id uuid,
  p_index_id uuid
)
RETURNS TABLE (
  index_id text,
  table_id uuid,
  index_name text,
  method text,
  is_unique boolean,
  comment_text text,
  source text,
  column_ids uuid[],
  column_names text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_diagram_id uuid;
  v_current erd.entity_index%ROWTYPE;
  v_column_ids uuid[];
  v_column_names text[];
BEGIN
  SELECT t.diagram_id
  INTO v_diagram_id
  FROM erd.entity_table t
  WHERE t.table_id = p_table_id
    AND t.is_deleted = false;

  IF v_diagram_id IS NULL OR NOT api.fn_can_edit_diagram(v_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to delete index on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_current
  FROM erd.entity_index i
  WHERE i.table_id = p_table_id
    AND i.index_id = p_index_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF COALESCE(v_current.source, 'user') <> 'user' THEN
    RAISE EXCEPTION 'INDEX_SYSTEM_LOCKED'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    COALESCE(array_agg(ic.column_id ORDER BY ic.ordinal_position), ARRAY[]::uuid[]),
    COALESCE(array_agg(c.column_name ORDER BY ic.ordinal_position), ARRAY[]::text[])
  INTO v_column_ids, v_column_names
  FROM erd.entity_index_column ic
  LEFT JOIN erd.entity_column c ON c.column_id = ic.column_id
  WHERE ic.index_id = p_index_id;

  DELETE FROM erd.entity_index i
  WHERE i.table_id = p_table_id
    AND i.index_id = p_index_id;

  RETURN QUERY
  SELECT
    v_current.index_id::text,
    v_current.table_id,
    v_current.index_name,
    lower(v_current.method) AS method,
    v_current.is_unique,
    v_current.comment_text,
    COALESCE(v_current.source, 'user') AS source,
    v_column_ids,
    v_column_names;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_diagram_get_indexes(uuid)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_export_get_indexes_v1(uuid)
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_index_create(uuid, text, text, boolean, text, uuid[])
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_index_update(uuid, uuid, text, text, boolean, text, uuid[])
TO app_anon, app_user, app_service;

GRANT EXECUTE ON FUNCTION api.fn_index_delete(uuid, uuid)
TO app_anon, app_user, app_service;
