-- Groundswell partners: outside agencies and resellers who submit businesses
-- for Croissance audits and see the results of the audits they submitted.
--
-- Partners do NOT get Supabase Auth accounts: every signed-in Supabase user is
-- an admin on this site (requireAdmin and the `authenticated` RLS policies), so
-- partner sign-in is separate. Passwords are scrypt hashes; sessions and
-- invite/reset links are stored only as SHA-256 digests. All three tables have
-- RLS on and no policies: only the service role (the api/groundswell/* routes)
-- reads or writes them.
--
-- Also moves the worker ping to /api/groundswell/worker (the old
-- /api/audits/worker path still rewrites there).

CREATE TABLE IF NOT EXISTS groundswell_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL CHECK (length(btrim(company)) BETWEEN 2 AND 120),
  contact_name text CHECK (contact_name IS NULL OR length(contact_name) <= 120),
  email text NOT NULL CHECK (email = lower(btrim(email)) AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  password_hash text,
  status text NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_sign_in_at timestamptz,
  CHECK (status <> 'active' OR password_hash IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS groundswell_partners_email_key ON groundswell_partners (email);

CREATE TABLE IF NOT EXISTS groundswell_partner_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES groundswell_partners(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz
);

CREATE INDEX IF NOT EXISTS groundswell_partner_sessions_partner_idx ON groundswell_partner_sessions (partner_id);

-- One-time links: an invite (sets the first password) or a password reset.
CREATE TABLE IF NOT EXISTS groundswell_partner_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES groundswell_partners(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('invite', 'reset')),
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS groundswell_partner_tokens_partner_idx ON groundswell_partner_tokens (partner_id);

ALTER TABLE groundswell_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE groundswell_partner_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE groundswell_partner_tokens ENABLE ROW LEVEL SECURITY;

-- Which partner submitted an audit (null: queued by an admin).
ALTER TABLE marketing_audits
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES groundswell_partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_audits_partner ON marketing_audits (partner_id, created_at);

CREATE OR REPLACE FUNCTION update_groundswell_partners_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER groundswell_partners_updated_at
  BEFORE UPDATE ON groundswell_partners
  FOR EACH ROW EXECUTE FUNCTION update_groundswell_partners_updated_at();

-- Expired sessions and links are useless; clear them daily.
SELECT cron.schedule(
  'groundswell-partner-cleanup',
  '17 4 * * *',
  $$
  DELETE FROM groundswell_partner_sessions WHERE expires_at < now() - interval '1 day';
  DELETE FROM groundswell_partner_tokens WHERE expires_at < now() - interval '7 days';
  $$
);

-- Same job name: cron.schedule replaces the existing job's command.
SELECT cron.schedule(
  'groundswell-worker',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.newwaveitfl.com/api/groundswell/worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-key', coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'blog_admin_api_key'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  )
  WHERE EXISTS (SELECT 1 FROM marketing_audits WHERE status = 'running');
  $$
);
