export interface WorkspaceCreateRequest {
  name: string;
  slug?: string;
  workspace_mode: "shared" | "personal" | "guest";
}

export interface AuthUser {
  user_id: string;
  email: string;
  display_name: string | null;
  status: string;
  primary_auth_provider: "email" | "google" | "github";
  email_verified_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
  session_id: string;
  access_token_expires_at: string;
  refresh_token_expires_at: string;
}

export interface AuthStatusResponse {
  user: AuthUser;
}

export interface EmailRegisterRequest {
  email: string;
  password: string;
  display_name?: string | null;
}

export interface EmailLoginRequest {
  email: string;
  password: string;
}

export interface OAuthStartRequest {
  redirect_path?: string | null;
  guest_workspace_id?: string | null;
  guest_project_id?: string | null;
}

export interface OAuthStartResponse {
  provider: "google" | "github";
  authorization_url: string;
  expires_at: string;
}

export interface GuestClaimRequest {
  workspace_id: string;
}

export interface GuestClaimResponse {
  workspace_id: string;
  owner_user_id: string;
  claim_status: "claimed" | "already-owned";
  claimed_project_count: number;
  updated_at: string;
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

export interface WorkspaceListResponse {
  workspace_id: string;
  name: string;
  slug: string;
  workspace_mode: "shared" | "personal" | "guest";
  owner_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceEnsureDefaultResponse extends WorkspaceListResponse {
  was_created: boolean;
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

export interface ProjectListResponse {
  project_id: string;
  workspace_id: string;
  workspace_name: string;
  workspace_mode: "shared" | "personal" | "guest";
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
  comment_text?: string | null;
  pos_x: number;
  pos_y: number;
  color_hex?: string | null;
}

export interface TableUpdateRequest {
  display_name?: string | null;
  comment_text?: string | null;
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
  comment_text: string | null;
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
  example_value?: string | null;
  ui_width?: number | null;
  comment_text?: string | null;
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
  example_value?: string | null;
  ui_width?: number | null;
  comment_text?: string | null;
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
  example_value: string | null;
  ui_width: number | null;
  comment_text: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomTypeCreateRequest {
  schema_name: string;
  type_name: string;
  enum_values: string[];
}

export interface CustomTypeUpdateRequest {
  schema_name?: string | null;
  type_name?: string | null;
  enum_values?: string[] | null;
}

export interface CustomTypeResponse {
  custom_type_id: string;
  diagram_id: string;
  schema_name: string;
  type_name: string;
  kind: string;
  enum_values: string[];
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
  example_value: string | null;
  ui_width: number | null;
  comment_text: string | null;
}

export interface TableResponse {
  table_id: string;
  diagram_id: string;
  schema_name: string;
  table_name: string;
  display_name: string | null;
  comment_text: string | null;
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
  custom_types: CustomTypeResponse[];
}

export interface PostgresConnectionRequest {
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssl_mode?: string;
  connection_name?: string;
}

export interface PostgresConnectionTestResponse {
  status: string;
  database_name: string;
  current_user: string;
  server_version: string;
}

export interface PostgresSchemaListResponse {
  status: string;
  schemas: string[];
  default_schema: string;
}

export interface ImportPostgresRequest extends PostgresConnectionRequest {
  schema_name?: string | null;
  schema_names?: string[];
  import_all_schemas?: boolean;
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
  source_schema_names?: string[];
  export_all_schemas?: boolean;
}

export interface ExportSqlResponse {
  export_job_id: string;
  status: string;
  statement_count: number;
  sql_output: string;
}
