-- Groundswell customers: the businesses a partner (or New Wave) audits, as
-- records of their own. Until now a customer was just the audit row, so the
-- same business audited twice appeared twice and a second run had nothing to
-- attach to. Every audit now points at its customer (marketing_audits.
-- customer_id), and a customer's audits are its history.
--
-- groundswell_customers: partner_id (null: New Wave's own prospect, queued by
--   staff), the business's name, city, website, Instagram, competitors and
--   notes. RLS on and no policies, like the partner tables: only the service
--   role (api/groundswell/partner-customers.ts) reads or writes it directly.
-- marketing_audits.customer_id: the audit's customer. A BEFORE INSERT trigger
--   finds or creates the customer for any audit inserted without one (the
--   admin queue inserts through RLS as a signed-in user and never names the
--   column), so both paths read the same shape. The backfill below gives
--   every existing audit a customer the same way, oldest first, so a
--   customer carries the details of the first audit of that business.
--
-- Additive: the code reads customer_id only where it exists (42703 fallback)
-- and the partner customers route answers 503 until the table is here.

CREATE TABLE IF NOT EXISTS groundswell_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid REFERENCES groundswell_partners(id) ON DELETE CASCADE,
  business_name text NOT NULL CHECK (length(btrim(business_name)) BETWEEN 2 AND 120),
  city text CHECK (city IS NULL OR length(city) <= 120),
  website text CHECK (website IS NULL OR website ~* '^https?://[^\s/]+\.[^\s]+$'),
  instagram text CHECK (instagram IS NULL OR instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  competitors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(competitors) = 'array'),
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (website IS NOT NULL OR instagram IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS groundswell_customers_partner_idx ON groundswell_customers (partner_id, updated_at DESC);

ALTER TABLE groundswell_customers ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION update_groundswell_customers_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS groundswell_customers_updated_at ON groundswell_customers;
CREATE TRIGGER groundswell_customers_updated_at
  BEFORE UPDATE ON groundswell_customers
  FOR EACH ROW EXECUTE FUNCTION update_groundswell_customers_updated_at();

ALTER TABLE marketing_audits
  ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES groundswell_customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_audits_customer ON marketing_audits (customer_id, created_at DESC);

-- The customer an audit belongs to: the same owner, name and website as an
-- existing one, or a new record from the audit's details. SECURITY DEFINER so
-- the trigger below can create customers for audits a signed-in admin inserts
-- through RLS; not callable from the API (no EXECUTE for anon/authenticated).
CREATE OR REPLACE FUNCTION groundswell_customer_for_audit(
  p_partner_id uuid,
  p_business_name text,
  p_city text,
  p_website text,
  p_instagram text,
  p_competitors jsonb,
  p_notes text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  SELECT id INTO cid
    FROM groundswell_customers
   WHERE partner_id IS NOT DISTINCT FROM p_partner_id
     AND lower(btrim(business_name)) = lower(btrim(p_business_name))
     AND lower(website) IS NOT DISTINCT FROM lower(p_website)
   ORDER BY created_at
   LIMIT 1;
  IF cid IS NULL THEN
    INSERT INTO groundswell_customers (partner_id, business_name, city, website, instagram, competitors, notes)
    VALUES (p_partner_id, btrim(p_business_name), p_city, p_website, p_instagram, COALESCE(p_competitors, '[]'::jsonb), left(p_notes, 2000))
    RETURNING id INTO cid;
  END IF;
  RETURN cid;
END;
$$;

REVOKE ALL ON FUNCTION groundswell_customer_for_audit(uuid, text, text, text, text, jsonb, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION groundswell_link_audit_customer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    NEW.customer_id := groundswell_customer_for_audit(
      NEW.partner_id, NEW.business_name, NEW.city, NEW.website, NEW.instagram, NEW.competitors, NEW.notes
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_audits_customer ON marketing_audits;
CREATE TRIGGER marketing_audits_customer
  BEFORE INSERT ON marketing_audits
  FOR EACH ROW EXECUTE FUNCTION groundswell_link_audit_customer();

-- Backfill, oldest audit first, so each business's first audit shapes its customer.
DO $$
DECLARE
  a RECORD;
BEGIN
  FOR a IN
    SELECT id, partner_id, business_name, city, website, instagram, competitors, notes
      FROM marketing_audits
     WHERE customer_id IS NULL
     ORDER BY created_at
  LOOP
    UPDATE marketing_audits
       SET customer_id = groundswell_customer_for_audit(a.partner_id, a.business_name, a.city, a.website, a.instagram, a.competitors, a.notes)
     WHERE id = a.id;
  END LOOP;
END $$;
