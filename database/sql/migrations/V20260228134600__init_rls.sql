ALTER TABLE erd.app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.workspace ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.workspace_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.project ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.diagram ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.diagram_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.db_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.entity_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.entity_column ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.entity_relationship ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.entity_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.entity_index_column ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.entity_check_constraint ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.custom_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.visual_area ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.visual_note ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.import_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.export_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE erd.audit_event ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_user_select_self ON erd.app_user;
CREATE POLICY app_user_select_self
ON erd.app_user
FOR SELECT
USING (user_id = api.fn_current_user_uuid());

DROP POLICY IF EXISTS workspace_read ON erd.workspace;
CREATE POLICY workspace_read
ON erd.workspace
FOR SELECT
USING (api.fn_can_read_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_write ON erd.workspace;
CREATE POLICY workspace_write
ON erd.workspace
FOR UPDATE
USING (api.fn_can_edit_workspace(workspace_id))
WITH CHECK (api.fn_can_edit_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_insert ON erd.workspace;
CREATE POLICY workspace_insert
ON erd.workspace
FOR INSERT
WITH CHECK (
  owner_user_id = api.fn_current_user_uuid()
  OR owner_user_id IS NULL
);

DROP POLICY IF EXISTS workspace_member_read ON erd.workspace_member;
CREATE POLICY workspace_member_read
ON erd.workspace_member
FOR SELECT
USING (api.fn_can_read_workspace(workspace_id));

DROP POLICY IF EXISTS workspace_member_write ON erd.workspace_member;
CREATE POLICY workspace_member_write
ON erd.workspace_member
FOR ALL
USING (api.fn_is_workspace_admin(workspace_id))
WITH CHECK (api.fn_is_workspace_admin(workspace_id));

DROP POLICY IF EXISTS project_read ON erd.project;
CREATE POLICY project_read
ON erd.project
FOR SELECT
USING (api.fn_can_read_project(project_id));

DROP POLICY IF EXISTS project_insert ON erd.project;
CREATE POLICY project_insert
ON erd.project
FOR INSERT
WITH CHECK (
  (
    api.fn_current_user_uuid() IS NOT NULL
    AND (owner_user_id IS NULL OR owner_user_id = api.fn_current_user_uuid())
  )
  OR (
    visibility = 'public'
    AND allow_anonymous_edit = true
    AND owner_user_id IS NULL
  )
);

DROP POLICY IF EXISTS project_update_delete ON erd.project;
CREATE POLICY project_update_delete
ON erd.project
FOR UPDATE
USING (api.fn_can_edit_project(project_id))
WITH CHECK (api.fn_can_edit_project(project_id));

DROP POLICY IF EXISTS project_delete ON erd.project;
CREATE POLICY project_delete
ON erd.project
FOR DELETE
USING (api.fn_can_edit_project(project_id));

DROP POLICY IF EXISTS diagram_read ON erd.diagram;
CREATE POLICY diagram_read
ON erd.diagram
FOR SELECT
USING (api.fn_can_read_project(project_id));

DROP POLICY IF EXISTS diagram_insert ON erd.diagram;
CREATE POLICY diagram_insert
ON erd.diagram
FOR INSERT
WITH CHECK (api.fn_can_edit_project(project_id));

DROP POLICY IF EXISTS diagram_update_delete ON erd.diagram;
CREATE POLICY diagram_update_delete
ON erd.diagram
FOR UPDATE
USING (api.fn_can_edit_project(project_id))
WITH CHECK (api.fn_can_edit_project(project_id));

DROP POLICY IF EXISTS diagram_delete ON erd.diagram;
CREATE POLICY diagram_delete
ON erd.diagram
FOR DELETE
USING (api.fn_can_edit_project(project_id));

DROP POLICY IF EXISTS diagram_snapshot_rw ON erd.diagram_snapshot;
CREATE POLICY diagram_snapshot_rw
ON erd.diagram_snapshot
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS db_connection_rw ON erd.db_connection;
CREATE POLICY db_connection_rw
ON erd.db_connection
FOR ALL
USING (api.fn_can_read_workspace(workspace_id))
WITH CHECK (api.fn_can_edit_workspace(workspace_id));

DROP POLICY IF EXISTS entity_table_rw ON erd.entity_table;
CREATE POLICY entity_table_rw
ON erd.entity_table
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS entity_column_rw ON erd.entity_column;
CREATE POLICY entity_column_rw
ON erd.entity_column
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM erd.entity_table t
    WHERE t.table_id = entity_column.table_id
      AND api.fn_can_read_diagram(t.diagram_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM erd.entity_table t
    WHERE t.table_id = entity_column.table_id
      AND api.fn_can_edit_diagram(t.diagram_id)
  )
);

DROP POLICY IF EXISTS entity_relationship_rw ON erd.entity_relationship;
CREATE POLICY entity_relationship_rw
ON erd.entity_relationship
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS entity_index_rw ON erd.entity_index;
CREATE POLICY entity_index_rw
ON erd.entity_index
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM erd.entity_table t
    WHERE t.table_id = entity_index.table_id
      AND api.fn_can_read_diagram(t.diagram_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM erd.entity_table t
    WHERE t.table_id = entity_index.table_id
      AND api.fn_can_edit_diagram(t.diagram_id)
  )
);

DROP POLICY IF EXISTS entity_index_column_rw ON erd.entity_index_column;
CREATE POLICY entity_index_column_rw
ON erd.entity_index_column
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM erd.entity_index i
    JOIN erd.entity_table t ON t.table_id = i.table_id
    WHERE i.index_id = entity_index_column.index_id
      AND api.fn_can_read_diagram(t.diagram_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM erd.entity_index i
    JOIN erd.entity_table t ON t.table_id = i.table_id
    WHERE i.index_id = entity_index_column.index_id
      AND api.fn_can_edit_diagram(t.diagram_id)
  )
);

DROP POLICY IF EXISTS entity_check_constraint_rw ON erd.entity_check_constraint;
CREATE POLICY entity_check_constraint_rw
ON erd.entity_check_constraint
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM erd.entity_table t
    WHERE t.table_id = entity_check_constraint.table_id
      AND api.fn_can_read_diagram(t.diagram_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM erd.entity_table t
    WHERE t.table_id = entity_check_constraint.table_id
      AND api.fn_can_edit_diagram(t.diagram_id)
  )
);

DROP POLICY IF EXISTS custom_type_rw ON erd.custom_type;
CREATE POLICY custom_type_rw
ON erd.custom_type
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS visual_area_rw ON erd.visual_area;
CREATE POLICY visual_area_rw
ON erd.visual_area
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS visual_note_rw ON erd.visual_note;
CREATE POLICY visual_note_rw
ON erd.visual_note
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS import_job_rw ON erd.import_job;
CREATE POLICY import_job_rw
ON erd.import_job
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS export_job_rw ON erd.export_job;
CREATE POLICY export_job_rw
ON erd.export_job
FOR ALL
USING (api.fn_can_read_diagram(diagram_id))
WITH CHECK (api.fn_can_edit_diagram(diagram_id));

DROP POLICY IF EXISTS audit_event_read ON erd.audit_event;
CREATE POLICY audit_event_read
ON erd.audit_event
FOR SELECT
USING (api.fn_can_read_workspace(workspace_id));

DROP POLICY IF EXISTS audit_event_insert ON erd.audit_event;
CREATE POLICY audit_event_insert
ON erd.audit_event
FOR INSERT
WITH CHECK (api.fn_can_edit_workspace(workspace_id));
