-- Groundswell's three phases (2026-10-22, owner's choices):
--   1. audit        a business's public data, read through Composio's consumer
--                   account: the audit, slides and summary.
--   2. competitors  the plan against competitors from phase 1's data: the
--                   benchmark, website and ad improvements, and the ad sets
--                   (Meta and Google, the business's own Instagram images,
--                   low / medium / high spend with the return on each).
--   3. integrated   once a client's accounts are linked in the Composio
--                   project: the plan re-read against its real figures.
-- Each phase is its own run (a marketing_audits row) pointing at the run it
-- builds on (source_audit_id); the engine reads that run's step outputs as
-- the start of its own. Phase 1 queues phase 2 when it delivers, and phase 2
-- queues phase 3 for a client with a linked account.
--
-- Additive: the code reads the new columns only where they exist and falls
-- back to start_queued_audits without start_queued_runs.

ALTER TABLE marketing_audits ADD COLUMN IF NOT EXISTS phase text NOT NULL DEFAULT 'audit';
DO $$
BEGIN
  ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_phase_check CHECK (phase IN ('audit', 'competitors', 'integrated'));
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;
ALTER TABLE marketing_audits ADD COLUMN IF NOT EXISTS source_audit_id uuid REFERENCES marketing_audits(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS marketing_audits_customer_phase_idx ON marketing_audits (customer_id, phase, created_at DESC);
CREATE INDEX IF NOT EXISTS marketing_audits_source_idx ON marketing_audits (source_audit_id);

-- Phase 2 prints the ad sets; phase 3 the integrated plan.
ALTER TABLE groundswell_reports DROP CONSTRAINT IF EXISTS groundswell_reports_kind_check;
ALTER TABLE groundswell_reports ADD CONSTRAINT groundswell_reports_kind_check
  CHECK (kind IN ('summary', 'deck', 'audit', 'benchmark', 'adsets', 'integrated'));

-- Everything a run makes that is not a PDF: the Instagram images it picked,
-- the ad images built from them, a carousel, and the Meta and Google Ads
-- import files. Private like the reports: only /api/groundswell/asset signs a
-- link, after the same ownership check.
CREATE TABLE IF NOT EXISTS groundswell_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES marketing_audits(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('image', 'creative', 'carousel', 'export')),
  path text NOT NULL,
  name text NOT NULL,
  content_type text NOT NULL,
  bytes integer NOT NULL DEFAULT 0,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, path)
);
CREATE INDEX IF NOT EXISTS groundswell_assets_audit_idx ON groundswell_assets (audit_id);
ALTER TABLE groundswell_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_assets FROM anon, authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'groundswell-assets',
  'groundswell-assets',
  false,
  26214400,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Starts queued runs, giving each the step list for its phase (for phase 1,
-- its kind: an older benchmark run keeps its own list). step_lists maps
-- 'audit', 'benchmark', 'competitors' and 'integrated' to step names.
CREATE OR REPLACE FUNCTION start_queued_runs(step_lists jsonb, max_audits int DEFAULT 3)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  started uuid;
  started_kind text;
  started_phase text;
  names jsonb;
BEGIN
  FOR started, started_kind, started_phase IN
    UPDATE marketing_audits SET status = 'running', started_at = now(), completed_at = NULL, error = NULL
     WHERE id IN (SELECT id FROM marketing_audits WHERE status = 'queued' ORDER BY created_at LIMIT max_audits FOR UPDATE SKIP LOCKED)
    RETURNING id, kind, phase
  LOOP
    names := CASE
      WHEN started_phase <> 'audit' AND step_lists ? started_phase THEN step_lists -> started_phase
      WHEN started_kind = 'benchmark' AND step_lists ? 'benchmark' THEN step_lists -> 'benchmark'
      ELSE step_lists -> 'audit'
    END;
    IF names IS NULL OR jsonb_typeof(names) <> 'array' OR jsonb_array_length(names) = 0 THEN
      RAISE EXCEPTION 'start_queued_runs: no step list for phase % (kind %)', started_phase, started_kind;
    END IF;
    DELETE FROM marketing_audit_steps WHERE audit_id = started;
    INSERT INTO marketing_audit_steps (audit_id, step, position)
      SELECT started, t.name, t.ord
        FROM jsonb_array_elements_text(names) WITH ORDINALITY AS t(name, ord);
    RETURN NEXT started;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION start_queued_runs(jsonb, int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION start_queued_runs(jsonb, int) TO service_role;

-- Full auto: the heartbeat also fires while a run waits in the queue, and
-- the worker starts it (GROUNDSWELL_AUTO_START=off in Vercel turns that off).
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
  WHERE EXISTS (SELECT 1 FROM marketing_audits WHERE status IN ('running', 'queued'));
  $$
);
