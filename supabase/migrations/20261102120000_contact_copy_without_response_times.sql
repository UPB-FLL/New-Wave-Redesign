-- GEO audit, Phase 4 (docs/geo/fact-sheet.md, owner's answers of 2026-10-26):
-- Q6 drops every response-time promise from the copy ("within one business
-- day", "immediate assistance"), and the pricing subheadline takes the code
-- default now that the SaaS/HaaS tiers are retired (Q2).
--
-- Whole-field rewrites, each guarded on the md5 of the row as snapshotted
-- (docs/geo/evidence/2026-10-26/site_content-contact-pricing-copy.snapshot.json):
-- a row edited since is left alone. Idempotent; never raises. Exact restore:
-- supabase/rollbacks/20261102120000_restore_contact_pricing_copy.sql.
-- The code fallbacks for the same keys change in the same PR.

update public.site_content
set value = $t$Email the support team$t$, updated_at = now()
where section = 'contact' and key = 'email_sub'
  and md5(value) = 'a4945aab0df28714e004a8225347cdbd';

update public.site_content
set value = $t$Fill out the form below and one of our technicians will reach out — or call us now.$t$, updated_at = now()
where section = 'contact' and key = 'subheadline'
  and md5(value) = '44c9361f5301c5c0a6f72bcd71145b0f';

update public.site_content
set value = $t$Thanks for reaching out. A member of our team will contact you. For urgent issues, please call us directly.$t$, updated_at = now()
where section = 'contact' and key = 'success_body'
  and md5(value) = '08a183a7a779e0e8bda6446cea927fef';

update public.site_content
set value = $t$Select the services you need and get an instant estimate. Our team will follow up with a customized proposal.$t$, updated_at = now()
where section = 'pricing' and key = 'subheadline'
  and md5(value) = '9ab651aed2ae15efcb26f30a9d44761d';

