/*
  # Create pricing units and quote submissions tables

  ## Summary
  This migration creates tables for the dynamic pricing quote builder:

  1. pricing_units
    - `id` (uuid, primary key)
    - `name` (text) - Unit name (e.g., "Employees", "Computers")
    - `description` (text) - Description of the unit
    - `cost_per_unit` (numeric) - Cost per unit in cents
    - `min_quantity` (integer) - Minimum quantity allowed
    - `max_quantity` (integer) - Maximum quantity allowed
    - `sort_order` (integer) - Display order
    - `active` (boolean) - Whether this unit is active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. quote_submissions
    - `id` (uuid, primary key)
    - `name` (text) - Customer name
    - `email` (text) - Customer email
    - `phone` (text) - Customer phone
    - `company` (text) - Customer company
    - `selections` (jsonb) - Selected options with quantities
    - `estimated_total` (numeric) - Estimated cost in cents
    - `message` (text) - Additional message
    - `created_at` (timestamptz)

  3. Security
    - RLS enabled
    - Public SELECT on pricing_units
    - Authenticated users can insert quote_submissions
    - Public INSERT on quote_submissions (for form submissions)
*/

CREATE TABLE IF NOT EXISTS pricing_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  cost_per_unit numeric NOT NULL DEFAULT 0,
  min_quantity integer DEFAULT 1,
  max_quantity integer DEFAULT 1000,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pricing_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active pricing units"
  ON pricing_units
  FOR SELECT
  TO anon, authenticated
  USING (active = true);

CREATE POLICY "Authenticated users can manage pricing units"
  ON pricing_units
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default pricing units
INSERT INTO pricing_units (name, description, cost_per_unit, min_quantity, max_quantity, sort_order, active) VALUES
  ('Employees', 'Cost per employee/user account', 500, 1, 10000, 1, true),
  ('Computers', 'Cost per computer/device', 5000, 1, 10000, 2, true),
  ('Email Addresses', 'Cost per email address account', 300, 1, 10000, 3, true),
  ('Locations', 'Cost per physical location', 2000, 1, 1000, 4, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS quote_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text DEFAULT '',
  company text DEFAULT '',
  selections jsonb NOT NULL DEFAULT '{}'::jsonb,
  estimated_total numeric NOT NULL DEFAULT 0,
  message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE quote_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit quotes"
  ON quote_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can read all quote submissions"
  ON quote_submissions
  FOR SELECT
  TO authenticated
  USING (true);
