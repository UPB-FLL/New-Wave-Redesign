-- Groundswell: the engine that runs marketing audits on the site itself
-- (Vercel functions + this database), replacing the Claude Code routine.
--
-- An audit is a fixed list of steps (one row each in marketing_audit_steps,
-- in `position` order). api/audits/worker.ts claims the next runnable step
-- with claim_next_audit_step(), runs it within one function call, and saves
-- its output; the next step reads earlier outputs from here. Every minute
-- while any audit is running, pg_cron pings the worker, so an audit finishes
-- without anyone keeping the admin page open.
--
-- Before applying, the Vault secret blog_admin_api_key (Vercel's
-- ADMIN_API_KEY, added for the blog cron) must exist; the worker refuses
-- calls without it.

CREATE TABLE IF NOT EXISTS marketing_audit_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES marketing_audits(id) ON DELETE CASCADE,
  step text NOT NULL,
  position int NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'skipped', 'failed')),
  attempts int NOT NULL DEFAULT 0,
  output jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  UNIQUE (audit_id, step),
  UNIQUE (audit_id, position)
);

CREATE INDEX IF NOT EXISTS idx_marketing_audit_steps_runnable ON marketing_audit_steps(status, audit_id, position);

ALTER TABLE marketing_audit_steps ENABLE ROW LEVEL SECURITY;

-- Admins watch progress; only the service role (the worker) writes.
CREATE POLICY "Authenticated users can read marketing audit steps"
  ON marketing_audit_steps FOR SELECT TO authenticated USING (true);

-- Claims the next runnable step: the lowest pending step of a running audit
-- whose earlier steps are all done or skipped. A step left `running` longer
-- than lease_seconds belongs to a call that died, so it is claimable again.
-- SKIP LOCKED keeps two workers off the same step.
CREATE OR REPLACE FUNCTION claim_next_audit_step(lease_seconds int DEFAULT 600)
RETURNS SETOF marketing_audit_steps
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE marketing_audit_steps s
     SET status = 'running', attempts = s.attempts + 1, started_at = now(), error = NULL
   WHERE s.id = (
     SELECT s2.id
       FROM marketing_audit_steps s2
       JOIN marketing_audits a ON a.id = s2.audit_id
      WHERE a.status = 'running'
        AND (s2.status = 'pending'
             OR (s2.status = 'running' AND s2.started_at < now() - make_interval(secs => lease_seconds)))
        AND NOT EXISTS (
          SELECT 1 FROM marketing_audit_steps p
           WHERE p.audit_id = s2.audit_id AND p.position < s2.position AND p.status NOT IN ('done', 'skipped'))
      ORDER BY a.started_at, s2.position
      LIMIT 1
      FOR UPDATE OF s2 SKIP LOCKED)
  RETURNING s.*;
$$;

-- Moves up to max_audits queued audits to running and gives each its steps
-- (step_names in order). Returns the ids it started.
CREATE OR REPLACE FUNCTION start_queued_audits(step_names text[], max_audits int DEFAULT 3)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  started uuid;
BEGIN
  FOR started IN
    UPDATE marketing_audits SET status = 'running', started_at = now(), completed_at = NULL, error = NULL
     WHERE id IN (SELECT id FROM marketing_audits WHERE status = 'queued' ORDER BY created_at LIMIT max_audits FOR UPDATE SKIP LOCKED)
    RETURNING id
  LOOP
    DELETE FROM marketing_audit_steps WHERE audit_id = started;
    INSERT INTO marketing_audit_steps (audit_id, step, position)
      SELECT started, name, ord FROM unnest(step_names) WITH ORDINALITY AS t(name, ord);
    RETURN NEXT started;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION claim_next_audit_step(int) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION start_queued_audits(text[], int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION claim_next_audit_step(int) TO service_role;
GRANT EXECUTE ON FUNCTION start_queued_audits(text[], int) TO service_role;

-- Re-queueing an audit (requeue_marketing_audit) clears its old steps too.
CREATE OR REPLACE FUNCTION clear_steps_on_requeue()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'queued' AND OLD.status <> 'queued' THEN
    DELETE FROM marketing_audit_steps WHERE audit_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_audits_clear_steps ON marketing_audits;
CREATE TRIGGER marketing_audits_clear_steps
  AFTER UPDATE OF status ON marketing_audits
  FOR EACH ROW EXECUTE FUNCTION clear_steps_on_requeue();

-- Pings the worker every minute, but only while an audit is running.
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule(
  'groundswell-worker',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.newwaveitfl.com/api/audits/worker',
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
