-- The operations agent (2026-10-27): what it saw, what it proposed, what the
-- owner decided, and what it learned (api/_lib/groundswell/agent).
--
--   groundswell_agent_issues   one row per fingerprint: an observation a
--                              collector made (a failed run, a Headway action
--                              that failed, a service that stopped answering,
--                              anything posted from outside), its proposal,
--                              the decision, the outcome and whether it held
--   groundswell_agent_lessons  what was tried on which kind of issue and
--                              whether it worked: the agent's memory, read by
--                              the next proposal
--   groundswell_agent_reports  each 4-hour report sent (or skipped), so the
--                              next one knows what is new
--
-- RLS on and no policies on all three: only the service role
-- (api/groundswell/agent.ts) reads or writes them. Additive: the route answers
-- 503 until the tables exist; nothing else reads them. Every statement can run
-- again.

CREATE TABLE IF NOT EXISTS groundswell_agent_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL UNIQUE,
  source text NOT NULL,
  kind text NOT NULL,
  severity text NOT NULL DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error')),
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  subject jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'proposed', 'approved', 'resolving', 'resolved', 'dismissed', 'needs_developer')),
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  occurrences integer NOT NULL DEFAULT 1,
  recurrences integer NOT NULL DEFAULT 0,
  proposal jsonb,
  proposed_at timestamptz,
  approval_token_hash text,
  approval_expires_at timestamptz,
  decided_by text,
  decided_at timestamptz,
  resolved_at timestamptz,
  outcome jsonb,
  reported_at timestamptz,
  muted_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groundswell_agent_issues_status_idx ON groundswell_agent_issues (status, last_seen DESC);
CREATE INDEX IF NOT EXISTS groundswell_agent_issues_token_idx ON groundswell_agent_issues (approval_token_hash) WHERE approval_token_hash IS NOT NULL;
ALTER TABLE groundswell_agent_issues ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_agent_issues FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS groundswell_agent_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid REFERENCES groundswell_agent_issues(id) ON DELETE SET NULL,
  source text NOT NULL,
  kind text NOT NULL,
  resolver text NOT NULL,
  result text NOT NULL CHECK (result IN ('worked', 'failed')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groundswell_agent_lessons_kind_idx ON groundswell_agent_lessons (source, kind, resolver, created_at DESC);
ALTER TABLE groundswell_agent_lessons ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_agent_lessons FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS groundswell_agent_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_at timestamptz NOT NULL DEFAULT now(),
  to_email text NOT NULL,
  issue_ids uuid[] NOT NULL DEFAULT '{}',
  subject text NOT NULL,
  summary text NOT NULL DEFAULT '',
  email_id text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'skipped', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groundswell_agent_reports_sent_idx ON groundswell_agent_reports (sent_at DESC);
ALTER TABLE groundswell_agent_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_agent_reports FROM anon, authenticated;

-- updated_at, as the Headway tables keep it.
CREATE OR REPLACE TRIGGER groundswell_agent_issues_updated_at BEFORE UPDATE ON groundswell_agent_issues FOR EACH ROW EXECUTE FUNCTION groundswell_touch_updated_at();

-- Every 4 hours: one pass (check, collect, propose, report). The route
-- answers at once and runs the pass after the response, so the 5 s timeout
-- here only covers the call. Same job name: cron.schedule replaces the
-- existing job's command.
SELECT cron.schedule(
  'groundswell-agent-report',
  '0 */4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.newwaveitfl.com/api/groundswell/agent',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-key', coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'blog_admin_api_key'),
        ''
      )
    ),
    body := '{"action":"report"}'::jsonb,
    timeout_milliseconds := 5000
  )
  $$
);
