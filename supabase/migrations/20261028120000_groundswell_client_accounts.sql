-- Groundswell client accounts: the accounts a partner links for a client
-- (migration 20261027120000 gave customers their stage) through Composio's
-- hosted connect flow, one row per (customer, service). The Composio
-- connected account itself lives in New Wave's Composio project under the
-- user id `client:<customer id>`; this table remembers which account belongs
-- to which client, so a client's run can read its own data and the shared
-- scraping connections never pick a client's account by mistake.
--
-- RLS on and no policies, like the partner tables: only the service role
-- (api/groundswell/partner-accounts.ts) reads or writes it. Additive: the
-- route answers 503 until the table exists; nothing else reads it.

CREATE TABLE IF NOT EXISTS groundswell_client_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES groundswell_customers(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('google_analytics', 'google_search_console', 'googleads', 'instagram', 'metaads')),
  composio_account_id text NOT NULL,
  auth_config_id text NOT NULL,
  user_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed', 'expired', 'disabled')),
  status_reason text,
  linked_by uuid REFERENCES groundswell_partners(id) ON DELETE SET NULL,
  linked_at timestamptz,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, service)
);

CREATE INDEX IF NOT EXISTS groundswell_client_accounts_customer_idx ON groundswell_client_accounts (customer_id, service);

ALTER TABLE groundswell_client_accounts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_groundswell_client_accounts_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER groundswell_client_accounts_updated_at
  BEFORE UPDATE ON groundswell_client_accounts
  FOR EACH ROW EXECUTE FUNCTION update_groundswell_client_accounts_updated_at();
