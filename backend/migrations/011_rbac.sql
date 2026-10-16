-- Original IQ — 011: RBAC catalog (roles, permissions, assignments)
-- Runtime auth still uses users.role; these tables are the editable matrix.

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(64) NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT roles_key_unique UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS roles_sort_order_idx ON roles (sort_order);

DROP TRIGGER IF EXISTS roles_set_updated_at ON roles;
CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(80) NOT NULL,
  name varchar(120) NOT NULL,
  description text,
  category varchar(64) NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT permissions_key_unique UNIQUE (key)
);

CREATE INDEX IF NOT EXISTS permissions_category_idx ON permissions (category);

DROP TRIGGER IF EXISTS permissions_set_updated_at ON permissions;
CREATE TRIGGER permissions_set_updated_at
  BEFORE UPDATE ON permissions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_permission_id_idx ON role_permissions (permission_id);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, permission_id)
);

CREATE INDEX IF NOT EXISTS user_permissions_permission_id_idx ON user_permissions (permission_id);
