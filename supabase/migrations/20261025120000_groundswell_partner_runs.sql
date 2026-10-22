-- Groundswell: partners start their own audits.
--
-- Until now a partner could queue a business and only staff could press
-- "Run queued audits now". A partner now presses "Run audit" on a customer
-- and the audit starts at once, on the same engine and worker. Each run
-- spends money (OpenAI, Composio, Ahrefs, Keyword Planner), so two caps hold,
-- checked here in one transaction so two clicks cannot slip past them:
--
-- - one running audit per partner at a time;
-- - a rolling daily cap per partner, groundswell_partners.daily_run_limit
--   (NULL: the default the code passes, 3), counted over the last 24 hours
--   from started_at, so no time zone is involved. Staff edit it per partner
--   from /groundswell/admin/partners.
--
-- start_audit starts one named queued audit for one partner and gives it its
-- steps, exactly as start_queued_audits does for the three oldest. That
-- function, the admin button and the cron are untouched. The function returns
-- one row: outcome ('started', 'not_queued', 'another_running' or
-- 'daily_limit') and, for the two refusals, the business still running or
-- when the day's count next frees a run.
--
-- Depends on 20261022120000 (marketing_audits.kind) and 20261024120000
-- (customers). Additive: the code reads daily_run_limit only where it exists.

ALTER TABLE groundswell_partners
  ADD COLUMN IF NOT EXISTS daily_run_limit int CHECK (daily_run_limit IS NULL OR daily_run_limit BETWEEN 0 AND 50);

CREATE OR REPLACE FUNCTION start_audit(
  p_audit_id uuid,
  p_partner_id uuid,
  step_names text[],
  benchmark_step_names text[] DEFAULT NULL,
  default_daily_limit int DEFAULT 3
)
RETURNS TABLE (outcome text, running_business text, resets_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a RECORD;
  cap int;
  used int;
  other text;
  oldest timestamptz;
BEGIN
  -- One partner's checks at a time: a second click waits here and then sees the first.
  PERFORM pg_advisory_xact_lock(hashtext('groundswell_partner_run'), hashtext(p_partner_id::text));

  SELECT id, kind INTO a
    FROM marketing_audits
   WHERE id = p_audit_id AND partner_id = p_partner_id AND status = 'queued'
   FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'not_queued'::text, NULL::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT business_name INTO other
    FROM marketing_audits
   WHERE partner_id = p_partner_id AND status = 'running'
   ORDER BY started_at
   LIMIT 1;
  IF FOUND THEN
    RETURN QUERY SELECT 'another_running'::text, other, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT COALESCE(daily_run_limit, default_daily_limit) INTO cap FROM groundswell_partners WHERE id = p_partner_id;
  SELECT count(*), min(started_at) INTO used, oldest
    FROM marketing_audits
   WHERE partner_id = p_partner_id AND started_at >= now() - interval '24 hours';
  IF used >= cap THEN
    RETURN QUERY SELECT 'daily_limit'::text, NULL::text, oldest + interval '24 hours';
    RETURN;
  END IF;

  UPDATE marketing_audits SET status = 'running', started_at = now(), completed_at = NULL, error = NULL WHERE id = a.id;
  DELETE FROM marketing_audit_steps WHERE audit_id = a.id;
  INSERT INTO marketing_audit_steps (audit_id, step, position)
    SELECT a.id, name, ord
      FROM unnest(CASE WHEN a.kind = 'benchmark' AND benchmark_step_names IS NOT NULL THEN benchmark_step_names ELSE step_names END)
           WITH ORDINALITY AS t(name, ord);
  RETURN QUERY SELECT 'started'::text, NULL::text, NULL::timestamptz;
END;
$$;

REVOKE ALL ON FUNCTION start_audit(uuid, uuid, text[], text[], int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION start_audit(uuid, uuid, text[], text[], int) TO service_role;
