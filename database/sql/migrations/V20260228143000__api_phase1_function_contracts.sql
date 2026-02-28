-- Phase 1 API function contracts (all CRUD/read through api schema)

CREATE OR REPLACE FUNCTION api.fn_workspace_create(
  p_name text,
  p_slug text,
  p_owner_user_id uuid,
  p_workspace_mode text,
  p_actor_id uuid
)
RETURNS TABLE (
  workspace_id uuid,
  name text,
  slug text,
  owner_user_id uuid,
  workspace_mode text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  RETURN QUERY
  INSERT INTO erd.workspace (
    name,
    slug,
    owner_user_id,
    workspace_mode,
    created_by,
    updated_by
  )
  VALUES (
    p_name,
    p_slug,
    p_owner_user_id,
    p_workspace_mode,
    p_actor_id,
    p_actor_id
  )
  RETURNING
    erd.workspace.workspace_id,
    erd.workspace.name,
    erd.workspace.slug,
    erd.workspace.owner_user_id,
    erd.workspace.workspace_mode,
    erd.workspace.is_active,
    erd.workspace.created_at,
    erd.workspace.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_project_get(
  p_project_id uuid
)
RETURNS TABLE (
  project_id uuid,
  workspace_id uuid,
  owner_user_id uuid,
  name text,
  description text,
  visibility text,
  share_slug text,
  allow_anonymous_edit boolean,
  is_archived boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    p.project_id,
    p.workspace_id,
    p.owner_user_id,
    p.name,
    p.description,
    p.visibility,
    p.share_slug,
    p.allow_anonymous_edit,
    p.is_archived,
    p.created_at,
    p.updated_at
  FROM erd.project p
  WHERE p.project_id = p_project_id
    AND api.fn_can_read_project(p.project_id)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_create(
  p_workspace_id uuid,
  p_project_id uuid,
  p_name text,
  p_description text,
  p_actor_id uuid
)
RETURNS TABLE (
  diagram_id uuid,
  workspace_id uuid,
  project_id uuid,
  name text,
  description text,
  version_no bigint,
  viewport_x numeric,
  viewport_y numeric,
  viewport_zoom numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_project(p_project_id) THEN
    RAISE EXCEPTION 'forbidden to create diagram for project %', p_project_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.diagram (
    workspace_id,
    project_id,
    name,
    description,
    created_by,
    updated_by
  )
  VALUES (
    p_workspace_id,
    p_project_id,
    p_name,
    p_description,
    p_actor_id,
    p_actor_id
  )
  RETURNING
    erd.diagram.diagram_id,
    erd.diagram.workspace_id,
    erd.diagram.project_id,
    erd.diagram.name,
    erd.diagram.description,
    erd.diagram.version_no,
    erd.diagram.viewport_x,
    erd.diagram.viewport_y,
    erd.diagram.viewport_zoom,
    erd.diagram.created_at,
    erd.diagram.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_list_by_workspace(
  p_workspace_id uuid
)
RETURNS TABLE (
  diagram_id uuid,
  workspace_id uuid,
  project_id uuid,
  name text,
  description text,
  version_no bigint,
  viewport_x numeric,
  viewport_y numeric,
  viewport_zoom numeric,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    d.diagram_id,
    d.workspace_id,
    d.project_id,
    d.name,
    d.description,
    d.version_no,
    d.viewport_x,
    d.viewport_y,
    d.viewport_zoom,
    d.created_at,
    d.updated_at
  FROM erd.diagram d
  WHERE d.workspace_id = p_workspace_id
    AND api.fn_can_read_workspace(d.workspace_id)
  ORDER BY d.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_get_tables(
  p_diagram_id uuid
)
RETURNS TABLE (
  table_id uuid,
  diagram_id uuid,
  schema_name text,
  table_name text,
  display_name text,
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
  WHERE t.diagram_id = p_diagram_id
    AND t.is_deleted = false
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY c.table_id, c.ordinal_position;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_get_relationships(
  p_diagram_id uuid
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
  on_delete_action text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
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
    r.on_delete_action
  FROM erd.entity_relationship r
  WHERE r.diagram_id = p_diagram_id
    AND api.fn_can_read_diagram(r.diagram_id)
  ORDER BY r.name;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_snapshot_create(
  p_diagram_id uuid,
  p_label text,
  p_snapshot_payload jsonb,
  p_actor_id uuid
)
RETURNS TABLE (
  snapshot_id uuid,
  diagram_id uuid,
  version_no bigint,
  label text,
  snapshot_payload jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to snapshot diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.diagram_snapshot (
    diagram_id,
    version_no,
    label,
    snapshot_payload,
    created_by
  )
  VALUES (
    p_diagram_id,
    (
      SELECT COALESCE(MAX(ds.version_no), 0) + 1
      FROM erd.diagram_snapshot ds
      WHERE ds.diagram_id = p_diagram_id
    ),
    p_label,
    p_snapshot_payload,
    p_actor_id
  )
  RETURNING
    erd.diagram_snapshot.snapshot_id,
    erd.diagram_snapshot.diagram_id,
    erd.diagram_snapshot.version_no,
    erd.diagram_snapshot.label,
    erd.diagram_snapshot.snapshot_payload,
    erd.diagram_snapshot.created_at;
END;
$$;

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
    p_display_name,
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
  p_display_name text,
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
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update table on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE erd.entity_table t
  SET
    display_name = COALESCE(p_display_name, t.display_name),
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

CREATE OR REPLACE FUNCTION api.fn_column_create(
  p_table_id uuid,
  p_column_name text,
  p_ordinal_position integer,
  p_data_type text,
  p_udt_name text,
  p_is_nullable boolean,
  p_default_sql text,
  p_is_primary_key boolean,
  p_is_unique boolean
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
    is_unique
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
    p_is_unique
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
  p_is_unique boolean
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
    RAISE EXCEPTION 'forbidden to update column on table %', p_table_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE erd.entity_column c
  SET
    column_name = COALESCE(p_column_name, c.column_name),
    ordinal_position = COALESCE(p_ordinal_position, c.ordinal_position),
    data_type = COALESCE(p_data_type, c.data_type),
    udt_name = COALESCE(p_udt_name, c.udt_name),
    is_nullable = COALESCE(p_is_nullable, c.is_nullable),
    default_sql = COALESCE(p_default_sql, c.default_sql),
    is_primary_key = COALESCE(p_is_primary_key, c.is_primary_key),
    is_unique = COALESCE(p_is_unique, c.is_unique)
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
    c.created_at,
    c.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_relationship_create(
  p_diagram_id uuid,
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
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to create relationship on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.entity_relationship (
    diagram_id,
    name,
    from_table_id,
    from_column_id,
    to_table_id,
    to_column_id,
    cardinality_from,
    cardinality_to,
    on_update_action,
    on_delete_action,
    is_identifying
  )
  VALUES (
    p_diagram_id,
    p_name,
    p_from_table_id,
    p_from_column_id,
    p_to_table_id,
    p_to_column_id,
    p_cardinality_from,
    p_cardinality_to,
    p_on_update_action,
    p_on_delete_action,
    p_is_identifying
  )
  RETURNING
    erd.entity_relationship.relationship_id,
    erd.entity_relationship.diagram_id,
    erd.entity_relationship.name,
    erd.entity_relationship.from_table_id,
    erd.entity_relationship.from_column_id,
    erd.entity_relationship.to_table_id,
    erd.entity_relationship.to_column_id,
    erd.entity_relationship.cardinality_from,
    erd.entity_relationship.cardinality_to,
    erd.entity_relationship.on_update_action,
    erd.entity_relationship.on_delete_action,
    erd.entity_relationship.is_identifying,
    erd.entity_relationship.created_at,
    erd.entity_relationship.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_relationship_update(
  p_diagram_id uuid,
  p_relationship_id uuid,
  p_name text,
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
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to update relationship on diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  UPDATE erd.entity_relationship r
  SET
    name = COALESCE(p_name, r.name),
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

CREATE OR REPLACE FUNCTION api.fn_diagram_get_workspace(
  p_diagram_id uuid
)
RETURNS TABLE (workspace_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT d.workspace_id
  FROM erd.diagram d
  WHERE d.diagram_id = p_diagram_id
    AND api.fn_can_read_diagram(d.diagram_id)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION api.fn_db_connection_upsert(
  p_workspace_id uuid,
  p_name text,
  p_host text,
  p_port integer,
  p_database_name text,
  p_username text,
  p_password_secret_ref text,
  p_ssl_mode text
)
RETURNS TABLE (connection_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_workspace(p_workspace_id) THEN
    RAISE EXCEPTION 'forbidden to edit workspace %', p_workspace_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.db_connection (
    workspace_id,
    name,
    host,
    port,
    database_name,
    username,
    password_secret_ref,
    ssl_mode,
    is_active
  )
  VALUES (
    p_workspace_id,
    p_name,
    p_host,
    p_port,
    p_database_name,
    p_username,
    p_password_secret_ref,
    p_ssl_mode,
    true
  )
  ON CONFLICT (workspace_id, name)
  DO UPDATE SET
    host = EXCLUDED.host,
    port = EXCLUDED.port,
    database_name = EXCLUDED.database_name,
    username = EXCLUDED.username,
    password_secret_ref = EXCLUDED.password_secret_ref,
    ssl_mode = EXCLUDED.ssl_mode,
    is_active = true,
    updated_at = now()
  RETURNING erd.db_connection.connection_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_import_job_create(
  p_diagram_id uuid,
  p_connection_id uuid
)
RETURNS TABLE (import_job_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to import diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.import_job (
    diagram_id,
    connection_id,
    status,
    started_at
  )
  VALUES (
    p_diagram_id,
    p_connection_id,
    'running',
    now()
  )
  RETURNING erd.import_job.import_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_import_job_mark_success(
  p_import_job_id uuid,
  p_result_summary jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  UPDATE erd.import_job ij
  SET
    status = 'success',
    finished_at = now(),
    result_summary = p_result_summary,
    error_text = NULL
  WHERE ij.import_job_id = p_import_job_id
    AND EXISTS (
      SELECT 1
      FROM erd.diagram d
      WHERE d.diagram_id = ij.diagram_id
        AND api.fn_can_edit_diagram(d.diagram_id)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'import job not found or forbidden: %', p_import_job_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_import_job_mark_failed(
  p_import_job_id uuid,
  p_error_text text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  UPDATE erd.import_job ij
  SET
    status = 'failed',
    finished_at = now(),
    error_text = p_error_text
  WHERE ij.import_job_id = p_import_job_id
    AND EXISTS (
      SELECT 1
      FROM erd.diagram d
      WHERE d.diagram_id = ij.diagram_id
        AND api.fn_can_edit_diagram(d.diagram_id)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'import job not found or forbidden: %', p_import_job_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_clear_relationships(
  p_diagram_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to clear diagram relationships %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM erd.entity_relationship
  WHERE diagram_id = p_diagram_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_clear_columns(
  p_diagram_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to clear diagram columns %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM erd.entity_column c
  USING erd.entity_table t
  WHERE c.table_id = t.table_id
    AND t.diagram_id = p_diagram_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_diagram_clear_tables(
  p_diagram_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to clear diagram tables %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM erd.entity_table
  WHERE diagram_id = p_diagram_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_import_insert_table(
  p_diagram_id uuid,
  p_schema_name text,
  p_table_name text,
  p_display_name text,
  p_pos_x numeric,
  p_pos_y numeric
)
RETURNS TABLE (table_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to import table to diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.entity_table (
    diagram_id,
    schema_name,
    table_name,
    display_name,
    pos_x,
    pos_y
  )
  VALUES (
    p_diagram_id,
    p_schema_name,
    p_table_name,
    p_display_name,
    p_pos_x,
    p_pos_y
  )
  RETURNING erd.entity_table.table_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_import_insert_column(
  p_table_id uuid,
  p_column_name text,
  p_ordinal_position integer,
  p_data_type text,
  p_udt_name text,
  p_is_nullable boolean,
  p_default_sql text,
  p_is_primary_key boolean,
  p_is_unique boolean
)
RETURNS TABLE (column_id uuid)
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
    RAISE EXCEPTION 'forbidden to import column to table %', p_table_id
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
    is_unique
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
    p_is_unique
  )
  RETURNING erd.entity_column.column_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_import_insert_relationship(
  p_diagram_id uuid,
  p_name text,
  p_from_table_id uuid,
  p_from_column_id uuid,
  p_to_table_id uuid,
  p_to_column_id uuid,
  p_on_update_action text,
  p_on_delete_action text
)
RETURNS TABLE (relationship_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to import relationship to diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.entity_relationship (
    diagram_id,
    name,
    from_table_id,
    from_column_id,
    to_table_id,
    to_column_id,
    cardinality_from,
    cardinality_to,
    on_update_action,
    on_delete_action,
    is_identifying
  )
  VALUES (
    p_diagram_id,
    p_name,
    p_from_table_id,
    p_from_column_id,
    p_to_table_id,
    p_to_column_id,
    'N',
    '1',
    p_on_update_action,
    p_on_delete_action,
    false
  )
  RETURNING erd.entity_relationship.relationship_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_export_job_create(
  p_diagram_id uuid
)
RETURNS TABLE (export_job_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  IF NOT api.fn_can_edit_diagram(p_diagram_id) THEN
    RAISE EXCEPTION 'forbidden to export diagram %', p_diagram_id
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  INSERT INTO erd.export_job (
    diagram_id,
    status,
    target_format,
    started_at
  )
  VALUES (
    p_diagram_id,
    'running',
    'postgres_sql',
    now()
  )
  RETURNING erd.export_job.export_job_id;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_export_job_mark_success(
  p_export_job_id uuid,
  p_sql_output text,
  p_diff_summary jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  UPDATE erd.export_job ej
  SET
    status = 'success',
    finished_at = now(),
    sql_output = p_sql_output,
    diff_summary = p_diff_summary,
    error_text = NULL
  WHERE ej.export_job_id = p_export_job_id
    AND EXISTS (
      SELECT 1
      FROM erd.diagram d
      WHERE d.diagram_id = ej.diagram_id
        AND api.fn_can_edit_diagram(d.diagram_id)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'export job not found or forbidden: %', p_export_job_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_export_job_mark_failed(
  p_export_job_id uuid,
  p_error_text text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
BEGIN
  UPDATE erd.export_job ej
  SET
    status = 'failed',
    finished_at = now(),
    error_text = p_error_text
  WHERE ej.export_job_id = p_export_job_id
    AND EXISTS (
      SELECT 1
      FROM erd.diagram d
      WHERE d.diagram_id = ej.diagram_id
        AND api.fn_can_edit_diagram(d.diagram_id)
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'export job not found or forbidden: %', p_export_job_id
      USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION api.fn_export_get_tables(
  p_diagram_id uuid
)
RETURNS TABLE (
  table_id uuid,
  schema_name text,
  table_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    t.table_id,
    t.schema_name,
    t.table_name
  FROM erd.entity_table t
  WHERE t.diagram_id = p_diagram_id
    AND t.is_deleted = false
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY t.table_name;
$$;

CREATE OR REPLACE FUNCTION api.fn_export_get_columns(
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
  is_primary_key boolean
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
    c.is_primary_key
  FROM erd.entity_column c
  JOIN erd.entity_table t ON t.table_id = c.table_id
  WHERE c.table_id = p_table_id
    AND api.fn_can_read_diagram(t.diagram_id)
  ORDER BY c.ordinal_position;
$$;

CREATE OR REPLACE FUNCTION api.fn_export_get_relationships(
  p_diagram_id uuid
)
RETURNS TABLE (
  relationship_id uuid,
  name text,
  from_table_id uuid,
  from_column_id uuid,
  to_table_id uuid,
  to_column_id uuid,
  on_update_action text,
  on_delete_action text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
  SELECT
    r.relationship_id,
    r.name,
    r.from_table_id,
    r.from_column_id,
    r.to_table_id,
    r.to_column_id,
    r.on_update_action,
    r.on_delete_action
  FROM erd.entity_relationship r
  WHERE r.diagram_id = p_diagram_id
    AND api.fn_can_read_diagram(r.diagram_id)
  ORDER BY r.name;
$$;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA api TO app_anon, app_user, app_service;
