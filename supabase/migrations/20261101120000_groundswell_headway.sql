-- Headway, GroundSwell's implementation service (2026-10-26): what a customer
-- pays for, what Headway needs from it to do the work, and the actions it
-- carries out, each approved by a person before anything touches the
-- client's accounts.
--
--   groundswell_customer_services  the services switched on per customer
--                                  (one of the division's six), by staff
--   groundswell_setup_items        the setup checklist's typed items: an id,
--                                  an access the customer granted, or a login
--                                  held encrypted (GROUNDSWELL_SECRETS_KEY),
--                                  never in clear; linked accounts stay in
--                                  groundswell_client_accounts
--   groundswell_headway_plans      one plan per planning pass over a delivered
--                                  run: the actions it proposed
--   groundswell_headway_actions    each action: automatic (a Composio tool run
--                                  as the client's linked account) or a brief
--                                  for the team; proposed → approved →
--                                  applying → applied | failed, or declined;
--                                  a brief goes proposed → approved → done
--
-- RLS on and no policies on all four, like the partner tables: only the
-- service role (api/groundswell/headway.ts) reads or writes them. Additive:
-- the route answers 503 until the tables exist; nothing else reads them.
-- Every statement can run again.

CREATE TABLE IF NOT EXISTS groundswell_customer_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES groundswell_customers(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('social-media', 'brand-development', 'website-design', 'marketing', 'integration', 'digital-oversight')),
  enabled boolean NOT NULL DEFAULT true,
  granted_by text,
  granted_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, service)
);
CREATE INDEX IF NOT EXISTS groundswell_customer_services_customer_idx ON groundswell_customer_services (customer_id);
ALTER TABLE groundswell_customer_services ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_customer_services FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS groundswell_setup_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES groundswell_customers(id) ON DELETE CASCADE,
  key text NOT NULL,
  status text NOT NULL DEFAULT 'needed' CHECK (status IN ('needed', 'provided', 'waived')),
  -- AES-256-GCM, "v1:<iv>:<tag>:<ciphertext>" in base64; null for an access or a waived item.
  value_encrypted text,
  value_hint text,
  notes text,
  provided_by text,
  provided_at timestamptz,
  revealed_at timestamptz,
  revealed_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (customer_id, key)
);
CREATE INDEX IF NOT EXISTS groundswell_setup_items_customer_idx ON groundswell_setup_items (customer_id);
ALTER TABLE groundswell_setup_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_setup_items FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS groundswell_headway_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES groundswell_customers(id) ON DELETE CASCADE,
  audit_id uuid REFERENCES marketing_audits(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  summary text NOT NULL DEFAULT '',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groundswell_headway_plans_customer_idx ON groundswell_headway_plans (customer_id, created_at DESC);
ALTER TABLE groundswell_headway_plans ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_headway_plans FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS groundswell_headway_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES groundswell_headway_plans(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES groundswell_customers(id) ON DELETE CASCADE,
  service text NOT NULL CHECK (service IN ('social-media', 'brand-development', 'website-design', 'marketing', 'integration', 'digital-oversight')),
  kind text NOT NULL CHECK (kind IN ('automatic', 'handoff')),
  tool text,
  title text NOT NULL,
  detail text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'applying', 'applied', 'failed', 'declined', 'done')),
  blocked_by jsonb NOT NULL DEFAULT '[]'::jsonb,
  depends_on uuid REFERENCES groundswell_headway_actions(id) ON DELETE SET NULL,
  scheduled_for timestamptz,
  result jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  lease_until timestamptz,
  approved_by text,
  approved_at timestamptz,
  applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS groundswell_headway_actions_customer_idx ON groundswell_headway_actions (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS groundswell_headway_actions_due_idx ON groundswell_headway_actions (status, scheduled_for);
ALTER TABLE groundswell_headway_actions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON groundswell_headway_actions FROM anon, authenticated;

CREATE OR REPLACE FUNCTION groundswell_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER groundswell_customer_services_updated_at BEFORE UPDATE ON groundswell_customer_services FOR EACH ROW EXECUTE FUNCTION groundswell_touch_updated_at();
CREATE OR REPLACE TRIGGER groundswell_setup_items_updated_at BEFORE UPDATE ON groundswell_setup_items FOR EACH ROW EXECUTE FUNCTION groundswell_touch_updated_at();
CREATE OR REPLACE TRIGGER groundswell_headway_actions_updated_at BEFORE UPDATE ON groundswell_headway_actions FOR EACH ROW EXECUTE FUNCTION groundswell_touch_updated_at();

-- The heartbeat also fires while an approved action is due, so the worker
-- applies it within a minute (api/_lib/groundswell/background.ts). Same job
-- name: cron.schedule replaces the existing job's command.
SELECT cron.schedule(
  'groundswell-worker',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://www.newwaveitfl.com/api/groundswell/worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-key', coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'blog_admin_api_key'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  )
  WHERE EXISTS (SELECT 1 FROM marketing_audits WHERE status IN ('running', 'queued'))
     OR EXISTS (
       SELECT 1 FROM groundswell_headway_actions
       WHERE status IN ('approved', 'applying')
         AND (scheduled_for IS NULL OR scheduled_for <= now())
     );
  $$
);
