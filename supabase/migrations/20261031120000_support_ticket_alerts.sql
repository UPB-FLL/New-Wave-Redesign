-- New-ticket alerts (api/support/ticket-alerts.ts): one row per SuperOps
-- ticket already texted and emailed, so a webhook SuperOps delivers twice, or
-- a later check, never alerts the same ticket again.
--
-- RLS on with no policies, like the other support tables: only the service
-- role reads or writes it. Every statement can run again.

create table if not exists public.support_ticket_alerts (
  ticket_id text primary key,
  display_id text,
  subject text,
  alerted_at timestamptz not null default now()
);

alter table public.support_ticket_alerts enable row level security;

revoke all on public.support_ticket_alerts from anon, authenticated;
