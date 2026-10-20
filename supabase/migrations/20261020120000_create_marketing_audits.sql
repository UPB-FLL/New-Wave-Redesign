-- Marketing audits queue (NW Social Engineering).
-- An admin adds a business (and optionally its competitors) by website and/or
-- Instagram; the hourly marketing-audit routine picks up queued rows, runs the
-- .claude/skills/marketing-audit skill, uploads the reports to Google Drive
-- (Customers/<business>/, shared "anyone with the link") and writes the links
-- back here. Report links must be Google Drive links: the CHECK constraints
-- below reject anything else.

CREATE TABLE IF NOT EXISTS marketing_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL CHECK (length(btrim(business_name)) BETWEEN 2 AND 120),
  city text,
  website text CHECK (website IS NULL OR website ~* '^https?://[^\s/]+\.[^\s]+$'),
  instagram text CHECK (instagram IS NULL OR instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  competitors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(competitors) = 'array'),
  notes text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed')),
  error text,
  drive_folder_url text CHECK (drive_folder_url IS NULL OR drive_folder_url ~ '^https://drive\.google\.com/'),
  summary_pdf_url text CHECK (summary_pdf_url IS NULL OR summary_pdf_url ~ '^https://drive\.google\.com/'),
  deck_pdf_url text CHECK (deck_pdf_url IS NULL OR deck_pdf_url ~ '^https://drive\.google\.com/'),
  audit_pdf_url text CHECK (audit_pdf_url IS NULL OR audit_pdf_url ~ '^https://drive\.google\.com/'),
  requested_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  CHECK (website IS NOT NULL OR instagram IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_marketing_audits_status ON marketing_audits(status, created_at);

ALTER TABLE marketing_audits ENABLE ROW LEVEL SECURITY;

-- Signed-in admins see, add and remove requests. Only the service role (the
-- routine) changes status and links, so the admin screen can re-queue a row
-- but never write a report link.
CREATE POLICY "Authenticated users can read marketing audits"
  ON marketing_audits FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can queue marketing audits"
  ON marketing_audits FOR INSERT TO authenticated
  WITH CHECK (status = 'queued' AND drive_folder_url IS NULL AND summary_pdf_url IS NULL
              AND deck_pdf_url IS NULL AND audit_pdf_url IS NULL);

CREATE POLICY "Authenticated users can delete marketing audits"
  ON marketing_audits FOR DELETE TO authenticated USING (true);

-- Re-queueing (after adding a competitor, or after a failure) goes through this
-- function so the client never needs UPDATE rights on the table.
CREATE OR REPLACE FUNCTION requeue_marketing_audit(audit_id uuid, new_competitors jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF new_competitors IS NOT NULL AND jsonb_typeof(new_competitors) <> 'array' THEN
    RAISE EXCEPTION 'competitors must be an array';
  END IF;
  UPDATE marketing_audits
     SET status = 'queued',
         error = NULL,
         competitors = COALESCE(new_competitors, competitors),
         started_at = NULL,
         completed_at = NULL,
         updated_at = now()
   WHERE id = audit_id AND status <> 'running';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This audit is running or no longer exists; try again when it finishes.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION requeue_marketing_audit(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION requeue_marketing_audit(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION update_marketing_audits_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS marketing_audits_updated_at ON marketing_audits;
CREATE TRIGGER marketing_audits_updated_at
  BEFORE UPDATE ON marketing_audits
  FOR EACH ROW EXECUTE FUNCTION update_marketing_audits_updated_at();
