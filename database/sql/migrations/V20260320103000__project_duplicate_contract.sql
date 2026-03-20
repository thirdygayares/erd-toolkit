-- Project duplication contract
-- Clones the source project and its diagram schema using the api contract surface.

DROP FUNCTION IF EXISTS api.fn_project_duplicate(uuid, text);

CREATE OR REPLACE FUNCTION api.fn_project_duplicate(
  p_project_id uuid,
  p_name text
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = erd, api, public, pg_catalog
AS $$
DECLARE
  v_old_project erd.project%ROWTYPE;
  v_new_project erd.project%ROWTYPE;
  v_old_diagram RECORD;
  v_new_diagram erd.diagram%ROWTYPE;
  v_old_table RECORD;
  v_old_column RECORD;
  v_new_table_id uuid;
  v_new_column_id uuid;
BEGIN
  SELECT p.*
  INTO v_old_project
  FROM erd.project p
  WHERE p.project_id = p_project_id
    AND api.fn_can_read_project(p.project_id)
  LIMIT 1;

  IF v_old_project.project_id IS NULL THEN
    RAISE EXCEPTION 'project not found'
      USING ERRCODE = 'P0002';
  END IF;

  SELECT *
  INTO v_new_project
  FROM api.fn_project_create(
    p_workspace_id => v_old_project.workspace_id,
    p_name => p_name,
    p_visibility => v_old_project.visibility,
    p_description => v_old_project.description,
    p_allow_anonymous_edit => v_old_project.allow_anonymous_edit,
    p_share_slug => NULL
  );

  CREATE TEMP TABLE project_duplicate_table_map (
    source_table_id uuid PRIMARY KEY,
    target_table_id uuid NOT NULL
  ) ON COMMIT DROP;

  CREATE TEMP TABLE project_duplicate_column_map (
    source_column_id uuid PRIMARY KEY,
    target_column_id uuid NOT NULL
  ) ON COMMIT DROP;

  FOR v_old_diagram IN
    SELECT d.*
    FROM erd.diagram d
    WHERE d.project_id = v_old_project.project_id
      AND api.fn_can_read_diagram(d.diagram_id)
    ORDER BY d.created_at ASC, d.diagram_id ASC
  LOOP
    TRUNCATE project_duplicate_table_map;
    TRUNCATE project_duplicate_column_map;

    INSERT INTO erd.diagram (
      workspace_id,
      project_id,
      name,
      description,
      source_kind,
      source_schema_hash,
      last_synced_at,
      version_no,
      viewport_x,
      viewport_y,
      viewport_zoom,
      created_by,
      updated_by
    )
    VALUES (
      v_old_diagram.workspace_id,
      v_new_project.project_id,
      v_old_diagram.name,
      v_old_diagram.description,
      v_old_diagram.source_kind,
      v_old_diagram.source_schema_hash,
      v_old_diagram.last_synced_at,
      v_old_diagram.version_no,
      v_old_diagram.viewport_x,
      v_old_diagram.viewport_y,
      v_old_diagram.viewport_zoom,
      api.fn_current_user_uuid(),
      api.fn_current_user_uuid()
    )
    RETURNING * INTO v_new_diagram;

    INSERT INTO erd.custom_type (
      diagram_id,
      schema_name,
      type_name,
      kind,
      definition_json,
      created_at,
      updated_at
    )
    SELECT
      v_new_diagram.diagram_id,
      c.schema_name,
      c.type_name,
      c.kind,
      c.definition_json,
      now(),
      now()
    FROM erd.custom_type c
    WHERE c.diagram_id = v_old_diagram.diagram_id
    ORDER BY c.schema_name, c.type_name;

    FOR v_old_table IN
      SELECT t.*
      FROM erd.entity_table t
      WHERE t.diagram_id = v_old_diagram.diagram_id
        AND t.is_deleted = false
      ORDER BY t.table_name, t.table_id
    LOOP
      INSERT INTO erd.entity_table (
        diagram_id,
        schema_name,
        table_name,
        display_name,
        source_oid,
        pos_x,
        pos_y,
        width,
        height,
        color_hex,
        is_deleted,
        created_at,
        updated_at
      )
      VALUES (
        v_new_diagram.diagram_id,
        v_old_table.schema_name,
        v_old_table.table_name,
        v_old_table.display_name,
        v_old_table.source_oid,
        v_old_table.pos_x,
        v_old_table.pos_y,
        v_old_table.width,
        v_old_table.height,
        v_old_table.color_hex,
        v_old_table.is_deleted,
        now(),
        now()
      )
      RETURNING table_id INTO v_new_table_id;

      INSERT INTO project_duplicate_table_map (
        source_table_id,
        target_table_id
      )
      VALUES (
        v_old_table.table_id,
        v_new_table_id
      );

      FOR v_old_column IN
        SELECT c.*
        FROM erd.entity_column c
        WHERE c.table_id = v_old_table.table_id
        ORDER BY c.ordinal_position, c.column_id
      LOOP
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
          is_identity,
          is_generated,
          comment_text,
          example_value,
          created_at,
          updated_at
        )
        VALUES (
          v_new_table_id,
          v_old_column.column_name,
          v_old_column.ordinal_position,
          v_old_column.data_type,
          v_old_column.udt_name,
          v_old_column.is_nullable,
          v_old_column.default_sql,
          v_old_column.is_primary_key,
          v_old_column.is_unique,
          v_old_column.is_identity,
          v_old_column.is_generated,
          v_old_column.comment_text,
          v_old_column.example_value,
          now(),
          now()
        )
        RETURNING column_id INTO v_new_column_id;

        INSERT INTO project_duplicate_column_map (
          source_column_id,
          target_column_id
        )
        VALUES (
          v_old_column.column_id,
          v_new_column_id
        );
      END LOOP;

    END LOOP;

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
      is_identifying,
      created_at,
      updated_at
    )
    SELECT
      v_new_diagram.diagram_id,
      r.name,
      tm_from.target_table_id,
      cm_from.target_column_id,
      tm_to.target_table_id,
      cm_to.target_column_id,
      r.cardinality_from,
      r.cardinality_to,
      r.on_update_action,
      r.on_delete_action,
      r.is_identifying,
      now(),
      now()
    FROM erd.entity_relationship r
    JOIN project_duplicate_table_map tm_from
      ON tm_from.source_table_id = r.from_table_id
    JOIN project_duplicate_table_map tm_to
      ON tm_to.source_table_id = r.to_table_id
    JOIN project_duplicate_column_map cm_from
      ON cm_from.source_column_id = r.from_column_id
    JOIN project_duplicate_column_map cm_to
      ON cm_to.source_column_id = r.to_column_id
    WHERE r.diagram_id = v_old_diagram.diagram_id
    ORDER BY r.name, r.relationship_id;
  END LOOP;

  RETURN QUERY
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
  WHERE p.project_id = v_new_project.project_id;
END;
$$;

GRANT EXECUTE ON FUNCTION api.fn_project_duplicate(uuid, text) TO app_user, app_service;
