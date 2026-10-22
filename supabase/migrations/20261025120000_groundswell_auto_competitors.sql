-- Groundswell picks a benchmark's missing competitors (one local, one
-- country-wide, from Google Places) in a `competitors` step, so a benchmark
-- may be queued with fewer than two. The engine writes the picks back to
-- marketing_audits.competitors before the next step reads the row.
ALTER TABLE marketing_audits DROP CONSTRAINT IF EXISTS marketing_audits_benchmark_competitors_check;
