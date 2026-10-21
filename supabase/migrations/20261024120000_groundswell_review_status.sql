-- Groundswell: an audit its checks could not vouch for waits for a person.
--
-- After the write-up and the plan, each round reads the figures again and
-- compares (api/_lib/groundswell/verify.ts). When they still disagree after
-- the setup file's verification.max_rounds, or the reviewer could not keep the
-- write-up, the audit stops in 'review' before any PDF is built, until an admin
-- delivers it as it stands or runs the checks again.
--
-- Widening the CHECK is safe in either order with the code: code deployed
-- before this migration never writes 'review', and the new code falls back to
-- 'failed' (with the reason) where the database refuses it, so a held audit is
-- never delivered either way.
--
-- To undo (only once no audit is in review):
--   UPDATE marketing_audits SET status = 'failed' WHERE status = 'review';
--   ALTER TABLE marketing_audits DROP CONSTRAINT marketing_audits_status_check;
--   ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_status_check
--     CHECK (status IN ('queued', 'running', 'done', 'failed'));

ALTER TABLE marketing_audits DROP CONSTRAINT IF EXISTS marketing_audits_status_check;
ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_status_check
  CHECK (status IN ('queued', 'running', 'done', 'failed', 'review'));
