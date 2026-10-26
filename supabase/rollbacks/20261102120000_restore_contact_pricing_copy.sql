-- Exact restore of the four site_content rows rewritten by
-- supabase/migrations/20261102120000_contact_copy_without_response_times.sql,
-- from docs/geo/evidence/2026-10-26/site_content-contact-pricing-copy.snapshot.json.
-- Not a migration: this folder is outside supabase/migrations, so nothing
-- applies it on its own. Each restore is guarded on the rewritten value, so a
-- row edited again since is left alone. Idempotent.

update public.site_content
set value = $t$We respond within one business day$t$, updated_at = '2026-04-09 15:21:14.537467+00'
where section = 'contact' and key = 'email_sub'
  and md5(value) = '96eaf4b6732307e2a494c10bea82a78c';

update public.site_content
set value = $t$Fill out the form below and one of our technicians will reach out within one business day — or call us now for immediate assistance.$t$, updated_at = '2026-04-09 15:21:14.537467+00'
where section = 'contact' and key = 'subheadline'
  and md5(value) = 'ba66546e06d5a1130e37925c2faeceb5';

update public.site_content
set value = $t$Thanks for reaching out. A member of our team will contact you within one business day. For urgent issues, please call us directly.$t$, updated_at = '2026-04-09 15:21:14.537467+00'
where section = 'contact' and key = 'success_body'
  and md5(value) = '117f6ef43653d7d22fb894f4af1e0341';

update public.site_content
set value = $t$Choose the perfect plan for your business. All plans include 24/7 support and regular updates.$t$, updated_at = '2026-05-03 22:50:56.459+00'
where section = 'pricing' and key = 'subheadline'
  and md5(value) = 'af332df0807349f45265b3dcd1dd41f5';

