-- GEO audit, Phase 4 (docs/geo/fact-sheet.md, owner's answer to Q2 on
-- 2026-10-26): the published price list is the pricing_units table; the
-- SaaS / HaaS / Support tiers in site_content (pricing.tiers) were never
-- rendered by /pricing and are retired. The admin editor's Tiers block is
-- removed in the same PR, so nothing writes the key again.
--
-- Guarded on the md5 of the row as snapshotted
-- (docs/geo/evidence/2026-10-26/site_content-pricing-tiers.snapshot.json):
-- an edited row is left alone. Idempotent; never raises. Exact restore:
-- supabase/rollbacks/20261103120000_restore_pricing_tiers_row.sql.

delete from public.site_content
where section = 'pricing'
  and key = 'tiers'
  and md5(value) = '37fddba690c01d11138151f5dff1653e';
