-- Original IQ — 015: auth sessions (refresh tokens bound to a revocable, fixed-lifetime session)
-- A session starts at login/register and dies at expires_at (JWT_REFRESH_EXPIRES_IN, default 7d).
-- Refreshing never extends it. Logout revokes one session; password reset revokes all.

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);

DROP TRIGGER IF EXISTS auth_sessions_set_updated_at ON auth_sessions;
CREATE TRIGGER auth_sessions_set_updated_at
  BEFORE UPDATE ON auth_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Backend uses the service-role key (bypasses RLS); no policies = no anon/authenticated access.
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
