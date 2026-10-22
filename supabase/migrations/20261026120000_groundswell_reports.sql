-- Groundswell reports leave Google Drive for the app's own private storage:
-- one object per report in the `groundswell-reports` bucket and one row per
-- (audit, kind) here. Nothing is public. The only reader is
-- /api/groundswell/report, which checks that the caller is the partner that
-- queued the audit or an admin on the allow-list, then signs a short link.
-- The old Drive link columns stay for audits delivered before this change.

CREATE TABLE IF NOT EXISTS groundswell_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES marketing_audits(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('summary', 'deck', 'audit', 'benchmark')),
  path text NOT NULL,
  name text NOT NULL,
  pages integer NOT NULL DEFAULT 0,
  bytes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (audit_id, kind)
);

ALTER TABLE groundswell_reports ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (the engine and the report route) reads or writes.
REVOKE ALL ON groundswell_reports FROM anon, authenticated;

-- The private bucket. No storage policies either: the service role signs links.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('groundswell-reports', 'groundswell-reports', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
