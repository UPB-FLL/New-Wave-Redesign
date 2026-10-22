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
-- The app starts each queued run itself with its phase's steps
-- (startQueuedRuns in api/_lib/groundswell/engine.ts), so no new function is
-- needed. Additive: the code reads the new columns only where they exist, and
-- without them starts runs through start_queued_audits as before. Every
-- statement can run again. Applied to production on 2026-10-22 in three parts
-- (recorded there as groundswell_phases_columns_assets,
-- groundswell_phases_report_kinds and groundswell_phases_worker_cron).

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
