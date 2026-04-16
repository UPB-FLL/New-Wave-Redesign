/*
  # Create site_content table and admin access

  ## Summary
  This migration creates the infrastructure for the admin CMS:

  1. New Tables
    - `site_content`
      - `id` (uuid, primary key)
      - `section` (text) - which section of the site (hero, navbar, services, whyus, about, contact, footer)
      - `key` (text) - the content key within the section
      - `value` (text) - the content value (text, JSON string for complex objects)
      - `updated_at` (timestamptz) - last updated timestamp
      - Unique constraint on (section, key) pair

  2. Security
    - RLS enabled
    - Public SELECT so the site can read content
    - Authenticated users (admins) can INSERT, UPDATE, DELETE

  3. Seed Data
    - Initial content for all sections populated from hardcoded values
*/

CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL,
  key text NOT NULL,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  UNIQUE(section, key)
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site content"
  ON site_content
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert site content"
  ON site_content
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update site content"
  ON site_content
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete site content"
  ON site_content
  FOR DELETE
  TO authenticated
  USING (true);

-- Hero section seed data
INSERT INTO site_content (section, key, value) VALUES
  ('hero', 'badge', '24/7 IT Support — Always On, Always Ready'),
  ('hero', 'headline_part1', 'When technology'),
  ('hero', 'headline_accent', 'matters most'),
  ('hero', 'headline_part2', ', make sure it''s in the'),
  ('hero', 'headline_accent2', 'right hands.'),
  ('hero', 'subheadline', 'Industry-certified technicians, full-time project managers, and technology advisors — ready to protect, support, and scale your business IT infrastructure.'),
  ('hero', 'cta_primary', 'Get a Free Assessment'),
  ('hero', 'cta_secondary', 'Call Us Now'),
  ('hero', 'phone', '+19545550100'),
  ('hero', 'stats', '[{"value":"500+","label":"Clients Served"},{"value":"99.9%","label":"Uptime Guarantee"},{"value":"15+","label":"Years Experience"},{"value":"<1hr","label":"Avg Response Time"}]'),
  ('hero', 'feature_cards', '[{"title":"Cybersecurity","desc":"Enterprise-grade protection for your business data and systems."},{"title":"Cloud Solutions","desc":"Seamless migration and management of cloud environments."},{"title":"Managed IT Services","desc":"Proactive monitoring and full IT management 24/7."},{"title":"Network Infrastructure","desc":"High-performance networks built for reliability and scale."}]')
ON CONFLICT (section, key) DO NOTHING;

-- Navbar section seed data
INSERT INTO site_content (section, key, value) VALUES
  ('navbar', 'cta_label', 'Free Assessment'),
  ('navbar', 'logo_url', 'https://images.squarespace-cdn.com/content/v1/64c044f11baf2d14ebb899c6/fb59af7c-4a76-48a9-ab9d-88a58a54496e/new-wave-it-high-resolution-logo-transparent.png?format=500w')
ON CONFLICT (section, key) DO NOTHING;

-- Services section seed data
INSERT INTO site_content (section, key, value) VALUES
  ('services', 'section_label', 'What We Do'),
  ('services', 'headline', 'IT Services Built for Modern Business'),
  ('services', 'subheadline', 'From cybersecurity to cloud migration, our certified engineers deliver reliable IT solutions that keep your business moving.'),
  ('services', 'cards', '[{"title":"Cybersecurity","description":"Protect your business from evolving threats with enterprise-grade security solutions.","highlights":["Threat detection & response","Firewall & endpoint protection","Compliance audits"],"accent":"#39CCCC"},{"title":"Live IT Support","description":"Real humans, real solutions — available 24/7 for any IT issue, big or small.","highlights":["24/7 help desk access","Remote & on-site support","Fast resolution times"],"accent":"#5EBC67"},{"title":"IT Repair & Upgrades","description":"Hardware failures and slow systems don''t wait — neither do we.","highlights":["Hardware repair & replacement","System upgrades & optimization","Data recovery services"],"accent":"#39CCCC"},{"title":"Managed IT Services","description":"Fully managed IT so you can focus on growing your business, not troubleshooting it.","highlights":["Proactive monitoring 24/7","Patch management","IT roadmap & strategy"],"accent":"#5EBC67"},{"title":"Cloud Solutions","description":"Modernize your infrastructure with scalable, secure cloud environments built for your needs.","highlights":["Cloud migration & setup","Microsoft 365 management","Hybrid environment support"],"accent":"#39CCCC"},{"title":"Network Infrastructure","description":"Reliable, high-performance networks engineered for uptime and business continuity.","highlights":["Network design & installation","WiFi solutions & optimization","VPN & remote access"],"accent":"#5EBC67"}]')
ON CONFLICT (section, key) DO NOTHING;

-- WhyUs section seed data
INSERT INTO site_content (section, key, value) VALUES
  ('whyus', 'section_label', 'Why New Wave IT'),
  ('whyus', 'headline', 'Don''t let your IT needs get lost in the current.'),
  ('whyus', 'subheadline', 'We don''t just fix problems — we build long-term partnerships that keep your business technology running at its best.'),
  ('whyus', 'proof_points', '["No long-term contracts required","Flat-rate transparent pricing","Local Fort Lauderdale team","Average ticket resolution under 1 hour","Dedicated account manager for every client","Proactive — we fix issues before you notice them"]'),
  ('whyus', 'cta_label', 'Schedule a Free Assessment'),
  ('whyus', 'feature_cards', '[{"title":"24/7 Service & Monitoring","desc":"Round-the-clock monitoring and support so issues are caught and resolved before they impact your business."},{"title":"Industry-Certified Technicians","desc":"Microsoft, Cisco, and CompTIA certified engineers with deep expertise across platforms."},{"title":"Dedicated Project Managers","desc":"Every engagement comes with a dedicated project manager keeping timelines and deliverables on track."},{"title":"Strategic Technology Advisors","desc":"We align your technology investments with your business goals for long-term success."}]')
ON CONFLICT (section, key) DO NOTHING;

-- About section seed data
INSERT INTO site_content (section, key, value) VALUES
  ('about', 'section_label', 'About Us'),
  ('about', 'headline', 'Fort Lauderdale''s trusted IT partner'),
  ('about', 'paragraph1', 'New Wave IT was founded on one simple belief: businesses deserve IT support that actually works. We''re a team of certified engineers, project managers, and technology strategists based right here in South Florida.'),
  ('about', 'paragraph2', 'From small businesses to enterprise organizations, we''ve built our reputation on responsiveness, transparency, and results. When you work with us, you''re not just getting an IT vendor — you''re getting a partner invested in your success.'),
  ('about', 'paragraph3', 'We specialize in industries where downtime isn''t an option: healthcare, legal, finance, and more. Our proactive approach means we''re solving problems before they reach your desk.'),
  ('about', 'years_badge', '15+'),
  ('about', 'years_label', 'Years Serving South Florida'),
  ('about', 'team_tagline', 'Our team is ready'),
  ('about', 'team_sub', 'Certified engineers on standby 24/7')
ON CONFLICT (section, key) DO NOTHING;

-- Contact section seed data
INSERT INTO site_content (section, key, value) VALUES
  ('contact', 'section_label', 'Get In Touch'),
  ('contact', 'headline', 'Ready to get started?'),
  ('contact', 'headline_accent', 'Let''s talk.'),
  ('contact', 'subheadline', 'Fill out the form below and one of our technicians will reach out within one business day — or call us now for immediate assistance.'),
  ('contact', 'phone', '(954) 555-0100'),
  ('contact', 'phone_sub', '24/7 for emergencies'),
  ('contact', 'email', 'support@newwaveitfl.com'),
  ('contact', 'email_sub', 'We respond within one business day'),
  ('contact', 'address', '710 NW 5th Ave, Suite 1072'),
  ('contact', 'address_city', 'Fort Lauderdale, FL 33311'),
  ('contact', 'address_sub', 'Mon–Fri, 8am–6pm'),
  ('contact', 'success_title', 'Message Received!'),
  ('contact', 'success_body', 'Thanks for reaching out. A member of our team will contact you within one business day. For urgent issues, please call us directly.')
ON CONFLICT (section, key) DO NOTHING;

-- Footer section seed data
INSERT INTO site_content (section, key, value) VALUES
  ('footer', 'tagline', 'Fort Lauderdale''s trusted IT services partner. Protecting and powering South Florida businesses since 2009.'),
  ('footer', 'phone', '(954) 555-0100'),
  ('footer', 'email', 'support@newwaveitfl.com'),
  ('footer', 'address', '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311'),
  ('footer', 'privacy_url', '#'),
  ('footer', 'terms_url', '#')
ON CONFLICT (section, key) DO NOTHING;
