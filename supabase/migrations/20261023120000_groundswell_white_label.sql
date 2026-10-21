-- Groundswell white-label: a partner's reports carry the partner's name and
-- logo instead of New Wave's, and any audit can override the business's own
-- logo and main colour (when its website's are wrong or missing).
--
-- groundswell_partners.display_name: the name on the partner's reports (the
--   company when null); logo_url: an https link to the partner's logo.
-- marketing_audits.brand_logo_url / brand_color: the business's logo link and
--   main colour, set when it is queued.
--
-- Additive and nullable, so safe before or after the code: code deployed
-- before this migration never names the new columns, and the new code reads
-- them only where they exist (falling back on "column does not exist").

ALTER TABLE groundswell_partners ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE groundswell_partners ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE marketing_audits ADD COLUMN IF NOT EXISTS brand_logo_url text;
ALTER TABLE marketing_audits ADD COLUMN IF NOT EXISTS brand_color text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groundswell_partners_display_name_check') THEN
    ALTER TABLE groundswell_partners ADD CONSTRAINT groundswell_partners_display_name_check
      CHECK (display_name IS NULL OR length(btrim(display_name)) BETWEEN 2 AND 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'groundswell_partners_logo_url_check') THEN
    ALTER TABLE groundswell_partners ADD CONSTRAINT groundswell_partners_logo_url_check
      CHECK (logo_url IS NULL OR (logo_url ~ '^https://' AND length(logo_url) <= 500));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_audits_brand_logo_url_check') THEN
    ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_brand_logo_url_check
      CHECK (brand_logo_url IS NULL OR (brand_logo_url ~ '^https://' AND length(brand_logo_url) <= 500));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'marketing_audits_brand_color_check') THEN
    ALTER TABLE marketing_audits ADD CONSTRAINT marketing_audits_brand_color_check
      CHECK (brand_color IS NULL OR brand_color ~ '^#[0-9a-f]{6}$');
  END IF;
END $$;
