export interface WorkspaceCreateRequest {
  name: string;
  slug?: string;
  workspace_mode: "shared" | "personal" | "guest";
}

export interface WorkspaceResponse {
  workspace_id: string;
  name: string;
  slug: string;
  owner_user_id: string | null;
  workspace_mode: "shared" | "personal" | "guest";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateRequest {
  workspace_id: string;
  name: string;
  visibility: "public" | "private";
  description?: string | null;
  allow_anonymous_edit: boolean;
  share_slug?: string | null;
}

export interface ProjectVisibilityUpdateRequest {
  visibility: "public" | "private";
  allow_anonymous_edit: boolean;
}

export interface ProjectResponse {
  project_id: string;
  workspace_id: string;
  owner_user_id: string | null;
  name: string;
  description: string | null;
  visibility: "public" | "private";
  share_slug: string | null;
  allow_anonymous_edit: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiagramCreateRequest {
  workspace_id: string;
  project_id: string;
  name: string;
  description?: string | null;
}

export interface DiagramSummary {
  diagram_id: string;
  workspace_id: string;
  project_id: string;
  name: string;
  description: string | null;
  version_no: number;
  viewport_x: number;
  viewport_y: number;
  viewport_zoom: number;
  created_at: string;
  updated_at: string;
}

export interface SnapshotCreateRequest {
  label?: string | null;
  snapshot_payload: Record<string, unknown>;
}

export interface SnapshotResponse {
  snapshot_id: string;
  diagram_id: string;
  version_no: number;
  label: string | null;
  snapshot_payload: Record<string, unknown>;
  created_at: string;
}

export interface TableCreateRequest {
  schema_name: string;
  table_name: string;
  display_name?: string | null;
  pos_x: number;
  pos_y: number;
  color_hex?: string | null;
}

export interface TableUpdateRequest {
  display_name?: string | null;
  pos_x?: number | null;
  pos_y?: number | null;
  color_hex?: string | null;
  is_deleted?: boolean | null;
}

export interface TableMutationResponse {
  table_id: string;
  diagram_id: string;
  schema_name: string;
  table_name: string;
  display_name: string | null;
  pos_x: number;
  pos_y: number;
  color_hex: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ColumnCreateRequest {
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name?: string | null;
  is_nullable: boolean;
  default_sql?: string | null;
  is_primary_key: boolean;
  is_unique: boolean;
}

export interface ColumnUpdateRequest {
  column_name?: string | null;
  ordinal_position?: number | null;
  data_type?: string | null;
  udt_name?: string | null;
  is_nullable?: boolean | null;
  default_sql?: string | null;
  is_primary_key?: boolean | null;
  is_unique?: boolean | null;
}

export interface ColumnMutationResponse {
  column_id: string;
  table_id: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string | null;
  is_nullable: boolean;
  default_sql: string | null;
  is_primary_key: boolean;
  is_unique: boolean;
  created_at: string;
  updated_at: string;
}

export interface RelationshipCreateRequest {
  name: string;
  from_table_id: string;
  from_column_id: string;
  to_table_id: string;
  to_column_id: string;
  cardinality_from: "1" | "N";
  cardinality_to: "1" | "N";
  on_update_action: string;
  on_delete_action: string;
  is_identifying?: boolean;
}

export interface RelationshipUpdateRequest {
  name?: string | null;
  from_table_id?: string | null;
  from_column_id?: string | null;
  to_table_id?: string | null;
  to_column_id?: string | null;
  cardinality_from?: "1" | "N" | null;
  cardinality_to?: "1" | "N" | null;
  on_update_action?: string | null;
  on_delete_action?: string | null;
  is_identifying?: boolean | null;
}

export interface RelationshipMutationResponse {
  relationship_id: string;
  diagram_id: string;
  name: string;
  from_table_id: string;
  from_column_id: string;
  to_table_id: string;
  to_column_id: string;
  cardinality_from: "1" | "N";
  cardinality_to: "1" | "N";
  on_update_action: string;
  on_delete_action: string;
  is_identifying: boolean;
  created_at: string;
  updated_at: string;
}

export interface ColumnResponse {
  column_id: string;
  table_id: string;
  column_name: string;
  ordinal_position: number;
  data_type: string;
  udt_name: string | null;
  is_nullable: boolean;
  default_sql: string | null;
  is_primary_key: boolean;
  is_unique: boolean;
}

export interface TableResponse {
  table_id: string;
  diagram_id: string;
  schema_name: string;
  table_name: string;
  display_name: string | null;
  pos_x: number;
  pos_y: number;
  width: number | null;
  height: number | null;
  color_hex: string | null;
  columns: ColumnResponse[];
}

export interface RelationshipResponse {
  relationship_id: string;
  diagram_id: string;
  name: string;
  from_table_id: string;
  from_column_id: string;
  to_table_id: string;
  to_column_id: string;
  cardinality_from: string;
  cardinality_to: string;
  on_update_action: string;
  on_delete_action: string;
}

export interface DiagramDetailResponse {
  diagram: DiagramSummary;
  tables: TableResponse[];
  relationships: RelationshipResponse[];
}

export interface ImportPostgresRequest {
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  schema_name?: string;
  ssl_mode?: string;
  connection_name?: string;
}

export interface ImportPostgresResponse {
  import_job_id: string;
  connection_id: string;
  status: string;
  table_count: number;
  column_count: number;
  relationship_count: number;
}

export interface ExportSqlRequest {
  target_schema: string;
}

export interface ExportSqlResponse {
  export_job_id: string;
  status: string;
  statement_count: number;
  sql_output: string;
}
