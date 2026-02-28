CREATE TABLE IF NOT EXISTS erd.diagram (
  diagram_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES erd.workspace(workspace_id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES erd.project(project_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  source_kind text NOT NULL DEFAULT 'postgres',
  source_schema_hash text,
  last_synced_at timestamptz,
  version_no bigint NOT NULL DEFAULT 1,
  viewport_x numeric(12,2) NOT NULL DEFAULT 0,
  viewport_y numeric(12,2) NOT NULL DEFAULT 0,
  viewport_zoom numeric(8,4) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT diagram_workspace_name_unq UNIQUE (project_id, name)
);

CREATE TABLE IF NOT EXISTS erd.diagram_snapshot (
  snapshot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  version_no bigint NOT NULL,
  label text,
  snapshot_payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  CONSTRAINT diagram_snapshot_version_unq UNIQUE (diagram_id, version_no)
);

CREATE TABLE IF NOT EXISTS erd.db_connection (
  connection_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES erd.workspace(workspace_id) ON DELETE CASCADE,
  name text NOT NULL,
  host text NOT NULL,
  port integer NOT NULL DEFAULT 5432,
  database_name text NOT NULL,
  username text NOT NULL,
  password_secret_ref text NOT NULL,
  ssl_mode text NOT NULL DEFAULT 'prefer',
  is_active boolean NOT NULL DEFAULT true,
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT db_connection_port_ck CHECK (port BETWEEN 1 AND 65535),
  CONSTRAINT db_connection_ssl_mode_ck CHECK (ssl_mode IN ('disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full')),
  CONSTRAINT db_connection_name_unq UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS erd.entity_table (
  table_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  schema_name text NOT NULL,
  table_name text NOT NULL,
  display_name text,
  source_oid oid,
  pos_x numeric(12,2) NOT NULL DEFAULT 0,
  pos_y numeric(12,2) NOT NULL DEFAULT 0,
  width numeric(12,2),
  height numeric(12,2),
  color_hex text,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_table_unique_name_per_diagram UNIQUE (diagram_id, schema_name, table_name)
);

CREATE TABLE IF NOT EXISTS erd.entity_column (
  column_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES erd.entity_table(table_id) ON DELETE CASCADE,
  column_name text NOT NULL,
  ordinal_position integer NOT NULL,
  data_type text NOT NULL,
  udt_name text,
  is_nullable boolean NOT NULL,
  default_sql text,
  is_primary_key boolean NOT NULL DEFAULT false,
  is_unique boolean NOT NULL DEFAULT false,
  is_identity boolean NOT NULL DEFAULT false,
  is_generated boolean NOT NULL DEFAULT false,
  comment_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_column_ordinal_ck CHECK (ordinal_position > 0),
  CONSTRAINT entity_column_unique_name_per_table UNIQUE (table_id, column_name),
  CONSTRAINT entity_column_unique_ordinal_per_table UNIQUE (table_id, ordinal_position)
);

CREATE TABLE IF NOT EXISTS erd.entity_relationship (
  relationship_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  name text NOT NULL,
  from_table_id uuid NOT NULL REFERENCES erd.entity_table(table_id) ON DELETE CASCADE,
  from_column_id uuid NOT NULL REFERENCES erd.entity_column(column_id) ON DELETE CASCADE,
  to_table_id uuid NOT NULL REFERENCES erd.entity_table(table_id) ON DELETE CASCADE,
  to_column_id uuid NOT NULL REFERENCES erd.entity_column(column_id) ON DELETE CASCADE,
  cardinality_from text NOT NULL DEFAULT 'N',
  cardinality_to text NOT NULL DEFAULT '1',
  on_update_action text NOT NULL DEFAULT 'NO ACTION',
  on_delete_action text NOT NULL DEFAULT 'NO ACTION',
  is_identifying boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_relationship_cardinality_from_ck CHECK (cardinality_from IN ('1', 'N')),
  CONSTRAINT entity_relationship_cardinality_to_ck CHECK (cardinality_to IN ('1', 'N')),
  CONSTRAINT entity_relationship_action_update_ck CHECK (on_update_action IN ('NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT')),
  CONSTRAINT entity_relationship_action_delete_ck CHECK (on_delete_action IN ('NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT')),
  CONSTRAINT entity_relationship_unique_edge UNIQUE (diagram_id, from_column_id, to_column_id)
);

CREATE TABLE IF NOT EXISTS erd.entity_index (
  index_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES erd.entity_table(table_id) ON DELETE CASCADE,
  index_name text NOT NULL,
  method text NOT NULL DEFAULT 'btree',
  is_unique boolean NOT NULL DEFAULT false,
  is_primary boolean NOT NULL DEFAULT false,
  where_predicate text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_index_unique_name_per_table UNIQUE (table_id, index_name)
);

CREATE TABLE IF NOT EXISTS erd.entity_index_column (
  index_column_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  index_id uuid NOT NULL REFERENCES erd.entity_index(index_id) ON DELETE CASCADE,
  column_id uuid NOT NULL REFERENCES erd.entity_column(column_id) ON DELETE CASCADE,
  ordinal_position integer NOT NULL,
  sort_direction text NOT NULL DEFAULT 'ASC',
  CONSTRAINT entity_index_column_ordinal_ck CHECK (ordinal_position > 0),
  CONSTRAINT entity_index_column_sort_dir_ck CHECK (sort_direction IN ('ASC', 'DESC')),
  CONSTRAINT entity_index_column_unique_col UNIQUE (index_id, column_id),
  CONSTRAINT entity_index_column_unique_ordinal UNIQUE (index_id, ordinal_position)
);

CREATE TABLE IF NOT EXISTS erd.entity_check_constraint (
  check_constraint_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES erd.entity_table(table_id) ON DELETE CASCADE,
  constraint_name text NOT NULL,
  check_sql text NOT NULL,
  is_validated boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_check_constraint_unique_name_per_table UNIQUE (table_id, constraint_name)
);

CREATE TABLE IF NOT EXISTS erd.custom_type (
  custom_type_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagram_id uuid NOT NULL REFERENCES erd.diagram(diagram_id) ON DELETE CASCADE,
  schema_name text NOT NULL,
  type_name text NOT NULL,
  kind text NOT NULL,
  definition_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT custom_type_kind_ck CHECK (kind IN ('enum', 'domain', 'composite')),
  CONSTRAINT custom_type_unique_per_diagram UNIQUE (diagram_id, schema_name, type_name)
);

CREATE TRIGGER trg_set_updated_at_diagram
BEFORE UPDATE ON erd.diagram
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_db_connection
BEFORE UPDATE ON erd.db_connection
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_entity_table
BEFORE UPDATE ON erd.entity_table
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_entity_column
BEFORE UPDATE ON erd.entity_column
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_entity_relationship
BEFORE UPDATE ON erd.entity_relationship
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_entity_index
BEFORE UPDATE ON erd.entity_index
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_entity_check_constraint
BEFORE UPDATE ON erd.entity_check_constraint
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_custom_type
BEFORE UPDATE ON erd.custom_type
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();
