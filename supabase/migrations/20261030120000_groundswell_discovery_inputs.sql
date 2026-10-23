-- Generated with supabase migration new; ordered after the existing phase migrations.
-- Optional public profile seeds; existing records and authorization policies remain unchanged.
alter table public.marketing_audits add column if not exists facebook text;
alter table public.groundswell_customers add column if not exists facebook text;
comment on column public.marketing_audits.facebook is 'Public Facebook Page supplied or confirmed for this run.';
comment on column public.groundswell_customers.facebook is 'Public Facebook Page saved with the business intake.';
