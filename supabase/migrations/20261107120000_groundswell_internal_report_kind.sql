-- Groundswell: the internal visibility brief (deliver_internal) is a report
-- kind of its own, 'internal': the keywords to use, the copy to paste and
-- the first month's fixes, for the team and the partner, not the client.
-- Additive: the constraint only widens. Until this runs, storing the brief
-- fails its (optional) step and the audit is delivered without it.
-- Rollback: delete the 'internal' rows (and their objects in the
-- groundswell-reports bucket), then re-add the constraint without it.
ALTER TABLE groundswell_reports DROP CONSTRAINT IF EXISTS groundswell_reports_kind_check;
ALTER TABLE groundswell_reports ADD CONSTRAINT groundswell_reports_kind_check
  CHECK (kind IN ('summary', 'deck', 'audit', 'benchmark', 'adsets', 'integrated', 'internal'));
