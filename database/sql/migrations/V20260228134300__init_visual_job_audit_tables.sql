CREATE TABLE IF NOT EXISTS erd.visual_area (
  area_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  name text NOT NULL,
  color_hex text,
  pos_x numeric(12,2) NOT NULL,
  pos_y numeric(12,2) NOT NULL,
  width numeric(12,2) NOT NULL,
  height numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erd.visual_note (
  note_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  content text NOT NULL,
  color_hex text,
  pos_x numeric(12,2) NOT NULL,
  pos_y numeric(12,2) NOT NULL,
  width numeric(12,2) NOT NULL,
  height numeric(12,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS erd.import_job (
  import_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES erd.db_connection(connection_id) ON DELETE RESTRICT,
  status text NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  result_summary jsonb,
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT import_job_status_ck CHECK (status IN ('queued', 'running', 'success', 'failed'))
);

CREATE TABLE IF NOT EXISTS erd.export_job (
  export_job_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  status text NOT NULL,
  target_format text NOT NULL DEFAULT 'postgres_sql',
  started_at timestamptz,
  finished_at timestamptz,
  sql_output text,
  diff_summary jsonb,
  error_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT export_job_status_ck CHECK (status IN ('queued', 'running', 'success', 'failed')),
  CONSTRAINT export_job_target_format_ck CHECK (target_format IN ('postgres_sql', 'dbml'))
);

CREATE TABLE IF NOT EXISTS erd.audit_event (
  audit_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES erd.workspace(workspace_id) ON DELETE CASCADE,
  project_id uuid REFERENCES erd.project(project_id) ON DELETE SET NULL,
  diagram_id uuid REFERENCES erd.diagram(diagram_id) ON DELETE SET NULL,
  user_id uuid REFERENCES erd.app_user(user_id) ON DELETE SET NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  changes_json jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_set_updated_at_visual_area
BEFORE UPDATE ON erd.visual_area
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_visual_note
BEFORE UPDATE ON erd.visual_note
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_import_job
BEFORE UPDATE ON erd.import_job
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_export_job
BEFORE UPDATE ON erd.export_job
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();
