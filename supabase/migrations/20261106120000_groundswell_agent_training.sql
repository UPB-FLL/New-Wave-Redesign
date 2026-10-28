-- The operations agent's daily training (2026-10-27): once a day the agent
-- trains on the day's fixes (api/_lib/groundswell/agent/train.ts) and logs
-- what it trained on and how.
--
--   groundswell_agent_training_runs  one row per training run: when, who or
--                                    what started it, the window of fixes it
--                                    read, what it trained on (the fixes and
--                                    the lessons, each listed), how (every
--                                    step with what it did), and what changed
--                                    in the playbook
--   groundswell_agent_playbook       one row per kind of issue (source, kind):
--                                    how each resolution has held, the order
--                                    the agent proposes them in, and the ones
--                                    ruled out; the 4-hour pass reads it
--
-- RLS on, no policies: only the service role reads or writes. Additive and
-- idempotent; before it is applied the pass proposes as it did (no playbook)
-- and the route's training answers 503.
--
-- Rollback: SELECT cron.unschedule('groundswell-agent-training');
--           DROP TABLE groundswell_agent_playbook, groundswell_agent_training_runs;

CREATE TABLE IF NOT EXISTS groundswell_agent_training_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'cron',
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'done', 'failed')),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  trained_on jsonb NOT NULL DEFAULT '{}'::jsonb,
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groundswell_agent_training_runs_started_idx ON groundswell_agent_training_runs (started_at DESC);
ALTER TABLE groundswell_agent_training_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_agent_training_runs FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS groundswell_agent_playbook (
  source text NOT NULL,
  kind text NOT NULL,
  -- The resolutions tried on this kind, best first (the order proposals follow).
  preferred text[] NOT NULL DEFAULT '{}',
  -- Failed RULED_OUT_AFTER times with no success: never proposed for this kind.
  ruled_out text[] NOT NULL DEFAULT '{}',
  -- Per resolver: { worked, failed, last }.
  stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  trained_at timestamptz NOT NULL DEFAULT now(),
  training_run_id uuid REFERENCES groundswell_agent_training_runs(id) ON DELETE SET NULL,
  PRIMARY KEY (source, kind)
);
ALTER TABLE groundswell_agent_playbook ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_agent_playbook FROM anon, authenticated;

-- Daily at 04:17 UTC (00:17 Eastern in summer, 23:17 in winter), after the
-- 04:00 pass has checked the day's resolutions. The route answers at once
-- and trains after the response. Same job name: cron.schedule replaces the
-- existing job's command.
SELECT cron.schedule(
  'groundswell-agent-training',
  '17 4 * * *',
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
    body := '{"action":"train"}'::jsonb,
    timeout_milliseconds := 5000
  )
  $$
);
