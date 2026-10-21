-- Groundswell competitor benchmark (spec: PR #110, docs/groundswell-competitor-benchmark.md).
--
-- marketing_audits.kind: 'audit' (as before) or 'benchmark' (the audit plus a
-- comparison with the top two competitors and a fourth PDF, benchmark_pdf_url).
-- start_queued_audits takes a second step list for benchmarks; called with two
-- arguments (the code deployed before this migration) it behaves as before.
--
-- Safe to apply before the code that uses it: old code never names `kind` or
-- `benchmark_pdf_url`, and its two-argument call resolves to the new function.

ALTER TABLE marketing_audits ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'audit';
ALTER TABLE marketing_audits ADD COLUMN IF NOT EXISTS benchmark_pdf_url text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_audits_kind_check') THEN
    ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_kind_check CHECK (kind IN ('audit', 'benchmark'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_audits_benchmark_pdf_url_check') THEN
    ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_benchmark_pdf_url_check
      CHECK (benchmark_pdf_url IS NULL OR benchmark_pdf_url ~ '^https://drive\.google\.com/');
  END IF;
  -- A benchmark compares the business with its top two competitors.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_audits_benchmark_competitors_check') THEN
    ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_benchmark_competitors_check
      CHECK (kind <> 'benchmark' OR jsonb_array_length(competitors) >= 2);
  END IF;
END $$;

-- Admins still insert queued rows without links, the new one included.
DROP POLICY IF EXISTS "Authenticated users can queue marketing audits" ON marketing_audits;
CREATE POLICY "Authenticated users can queue marketing audits" ON marketing_audits
  FOR INSERT TO authenticated
  WITH CHECK (
    status = 'queued'
    AND drive_folder_url IS NULL AND summary_pdf_url IS NULL AND deck_pdf_url IS NULL AND audit_pdf_url IS NULL
    AND benchmark_pdf_url IS NULL
  );

-- One function with a defaulted third argument, so two-argument calls keep working
-- (an overload beside the old one would make them ambiguous).
DROP FUNCTION IF EXISTS start_queued_audits(text[], int);
CREATE OR REPLACE FUNCTION start_queued_audits(step_names text[], max_audits int DEFAULT 3, benchmark_step_names text[] DEFAULT NULL)
RETURNS SETOF uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  started uuid;
  started_kind text;
BEGIN
  FOR started, started_kind IN
    UPDATE marketing_audits SET status = 'running', started_at = now(), completed_at = NULL, error = NULL
     WHERE id IN (SELECT id FROM marketing_audits WHERE status = 'queued' ORDER BY created_at LIMIT max_audits FOR UPDATE SKIP LOCKED)
    RETURNING id, kind
  LOOP
    DELETE FROM marketing_audit_steps WHERE audit_id = started;
    INSERT INTO marketing_audit_steps (audit_id, step, position)
      SELECT started, name, ord
        FROM unnest(CASE WHEN started_kind = 'benchmark' AND benchmark_step_names IS NOT NULL THEN benchmark_step_names ELSE step_names END)
             WITH ORDINALITY AS t(name, ord);
    RETURN NEXT started;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION start_queued_audits(text[], int, text[]) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION start_queued_audits(text[], int, text[]) TO service_role;
