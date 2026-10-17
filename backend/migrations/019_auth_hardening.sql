-- Original IQ — 019: reset-code brute-force limits + shared rate-limit counters
-- 1) login_verifications.code now holds sha256(code) hex; `attempts` counts wrong guesses and the
--    code is burned after the limit. Codes issued before this migration stop matching (10 min TTL).
-- 2) rate_limit_hits backs express-rate-limit for auth routes so limits hold across Vercel instances.
-- Functions are callable only with the service-role key.

ALTER TABLE login_verifications ALTER COLUMN code TYPE varchar(64);
ALTER TABLE login_verifications ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION login_verification_register_failure(p_id uuid, p_max_attempts integer)
RETURNS integer
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE login_verifications
  SET attempts = attempts + 1,
      used = used OR attempts + 1 >= p_max_attempts,
      used_at = CASE WHEN attempts + 1 >= p_max_attempts THEN now() ELSE used_at END
  WHERE id = p_id
  RETURNING attempts;
$$;

REVOKE ALL ON FUNCTION login_verification_register_failure(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION login_verification_register_failure(uuid, integer) TO service_role;

CREATE TABLE IF NOT EXISTS rate_limit_hits (
  key text PRIMARY KEY,
  hits integer NOT NULL DEFAULT 0,
  reset_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limit_hits_reset_at_idx ON rate_limit_hits (reset_at);

ALTER TABLE rate_limit_hits ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION rate_limit_hit(p_key text, p_window_ms integer)
RETURNS TABLE (hits integer, reset_at timestamptz)
LANGUAGE sql
SET search_path = public
AS $$
  INSERT INTO rate_limit_hits AS r (key, hits, reset_at)
  VALUES (p_key, 1, now() + make_interval(secs => p_window_ms / 1000.0))
  ON CONFLICT (key) DO UPDATE
  SET hits = CASE WHEN r.reset_at <= now() THEN 1 ELSE r.hits + 1 END,
      reset_at = CASE WHEN r.reset_at <= now() THEN EXCLUDED.reset_at ELSE r.reset_at END
  RETURNING r.hits, r.reset_at;
$$;

CREATE OR REPLACE FUNCTION rate_limit_decrement(p_key text)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  UPDATE rate_limit_hits SET hits = greatest(hits - 1, 0) WHERE key = p_key;
$$;

REVOKE ALL ON FUNCTION rate_limit_hit(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION rate_limit_decrement(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rate_limit_hit(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION rate_limit_decrement(text) TO service_role;
