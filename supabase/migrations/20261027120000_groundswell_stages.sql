-- Groundswell: prospects and clients. A customer record now carries a stage:
-- a prospect (a lead: its data was entered and Groundswell reads its public
-- data) or a client (a business the partner works for, whose own accounts can
-- be linked). "Became a client" moves one record over; nothing is copied, so
-- everything gathered as a prospect stays on the same page.
--
-- Additive: the code reads the two columns only where they exist (42703
-- fallback: every customer reads as a prospect, and moving one to client
-- answers 503 until this is applied).

ALTER TABLE groundswell_customers
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'prospect' CHECK (stage IN ('prospect', 'client')),
  ADD COLUMN IF NOT EXISTS became_client_at timestamptz;

CREATE INDEX IF NOT EXISTS groundswell_customers_stage_idx ON groundswell_customers (partner_id, stage, updated_at DESC);
