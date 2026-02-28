CREATE INDEX IF NOT EXISTS idx_workspace_owner_user_id
  ON erd.workspace (owner_user_id);

CREATE INDEX IF NOT EXISTS idx_workspace_member_user_workspace
  ON erd.workspace_member (user_id, workspace_id);

CREATE INDEX IF NOT EXISTS idx_project_workspace_visibility
  ON erd.project (workspace_id, visibility);

CREATE INDEX IF NOT EXISTS idx_project_share_slug
  ON erd.project (share_slug);

CREATE INDEX IF NOT EXISTS idx_diagram_project_id
  ON erd.diagram (project_id);

CREATE INDEX IF NOT EXISTS idx_diagram_workspace_id
  ON erd.diagram (workspace_id);

CREATE INDEX IF NOT EXISTS idx_diagram_snapshot_diagram_version
  ON erd.diagram_snapshot (diagram_id, version_no DESC);

CREATE INDEX IF NOT EXISTS idx_db_connection_workspace
  ON erd.db_connection (workspace_id);

CREATE INDEX IF NOT EXISTS idx_entity_table_diagram
  ON erd.entity_table (diagram_id);

CREATE INDEX IF NOT EXISTS idx_entity_column_table_ordinal
  ON erd.entity_column (table_id, ordinal_position);

CREATE INDEX IF NOT EXISTS idx_entity_relationship_diagram_tables
  ON erd.entity_relationship (diagram_id, from_table_id, to_table_id);

CREATE INDEX IF NOT EXISTS idx_entity_index_table
  ON erd.entity_index (table_id);

CREATE INDEX IF NOT EXISTS idx_entity_index_column_index
  ON erd.entity_index_column (index_id);

CREATE INDEX IF NOT EXISTS idx_entity_check_constraint_table
  ON erd.entity_check_constraint (table_id);

CREATE INDEX IF NOT EXISTS idx_custom_type_diagram
  ON erd.custom_type (diagram_id);

CREATE INDEX IF NOT EXISTS idx_visual_area_diagram
  ON erd.visual_area (diagram_id);

CREATE INDEX IF NOT EXISTS idx_visual_note_diagram
  ON erd.visual_note (diagram_id);

CREATE INDEX IF NOT EXISTS idx_import_job_diagram_status
  ON erd.import_job (diagram_id, status);

CREATE INDEX IF NOT EXISTS idx_export_job_diagram_status
  ON erd.export_job (diagram_id, status);

CREATE INDEX IF NOT EXISTS idx_audit_event_workspace_occurred
  ON erd.audit_event (workspace_id, occurred_at DESC);
