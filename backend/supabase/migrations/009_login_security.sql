-- Original IQ — 009: login attempts + email/password verification codes

CREATE TABLE IF NOT EXISTS login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(255) NOT NULL,
  ip_address varchar(45) NOT NULL,
  user_agent text,
  success boolean NOT NULL DEFAULT false,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_email_ip_idx ON login_attempts (email, ip_address);
CREATE INDEX IF NOT EXISTS login_attempts_locked_until_idx ON login_attempts (locked_until);

DROP TRIGGER IF EXISTS login_attempts_set_updated_at ON login_attempts;
CREATE TRIGGER login_attempts_set_updated_at
  BEFORE UPDATE ON login_attempts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS login_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code varchar(6) NOT NULL,
  type login_verification_type NOT NULL DEFAULT 'email',
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_verifications_user_id_idx ON login_verifications (user_id);
CREATE INDEX IF NOT EXISTS login_verifications_code_idx ON login_verifications (code);
CREATE INDEX IF NOT EXISTS login_verifications_expires_at_idx ON login_verifications (expires_at);

DROP TRIGGER IF EXISTS login_verifications_set_updated_at ON login_verifications;
CREATE TRIGGER login_verifications_set_updated_at
  BEFORE UPDATE ON login_verifications
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
