CREATE TABLE IF NOT EXISTS erd.app_user (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext NOT NULL UNIQUE,
  display_name text,
  password_hash text,
  status text NOT NULL DEFAULT 'active',
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_user_status_ck CHECK (status IN ('active', 'disabled', 'invited'))
);

CREATE TABLE IF NOT EXISTS erd.workspace (
  workspace_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  owner_user_id uuid REFERENCES erd.app_user(user_id) ON DELETE SET NULL,
  workspace_mode text NOT NULL DEFAULT 'shared',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT workspace_mode_ck CHECK (workspace_mode IN ('shared', 'personal', 'guest'))
);

CREATE TABLE IF NOT EXISTS erd.workspace_member (
  workspace_member_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES erd.workspace(workspace_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES erd.app_user(user_id) ON DELETE CASCADE,
  role text NOT NULL,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workspace_member_role_ck CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  CONSTRAINT workspace_member_unq UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS erd.project (
  project_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES erd.workspace(workspace_id) ON DELETE CASCADE,
  owner_user_id uuid REFERENCES erd.app_user(user_id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'public',
  share_slug text UNIQUE,
  allow_anonymous_edit boolean NOT NULL DEFAULT true,
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  CONSTRAINT project_visibility_ck CHECK (visibility IN ('public', 'private')),
  CONSTRAINT project_workspace_name_unq UNIQUE (workspace_id, name)
);

CREATE TRIGGER trg_set_updated_at_app_user
BEFORE UPDATE ON erd.app_user
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_workspace
BEFORE UPDATE ON erd.workspace
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_workspace_member
BEFORE UPDATE ON erd.workspace_member
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();

CREATE TRIGGER trg_set_updated_at_project
BEFORE UPDATE ON erd.project
FOR EACH ROW EXECUTE FUNCTION erd.fn_set_updated_at();
