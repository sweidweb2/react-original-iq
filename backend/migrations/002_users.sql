-- Original IQ — 002: users

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(120) NOT NULL,
  email varchar(255) NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  phone varchar(40),
  email_verified boolean NOT NULL DEFAULT false,
  email_verified_at timestamptz,
  permissions jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  nb_done integer NOT NULL DEFAULT 0,
  punctuality numeric(5, 2) NOT NULL DEFAULT 0,
  quality numeric(5, 2) NOT NULL DEFAULT 0,
  perfection numeric(5, 2) NOT NULL DEFAULT 0,
  avg_rating_star numeric(3, 2) NOT NULL DEFAULT 0,
  start_date date,
  remember_token varchar(255),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS users_is_active_idx ON users (is_active);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
