/*
  # Create seo_pages table for the admin SEO Portal

  ## Summary
  Adds storage for programmatically generated SEO landing / backlink pages.
  Each row represents a standalone public page rendered at `/l/:slug`.

  1. New Tables
    - `seo_pages`
      - `id` (uuid, primary key)
      - `slug` (text, unique) — URL slug, e.g. "msp-services-boston"
      - `title` (text) — meta title (<title>)
      - `meta_description` (text) — meta description
      - `meta_keywords` (text) — comma-separated keywords
      - `canonical_url` (text)
      - `og_image` (text) — absolute image URL for og:image / twitter:image
      - `hero_image` (text) — main hero/header image URL
      - `h1` (text) — visible page H1
      - `intro` (text) — short intro paragraph
      - `content` (text) — main body (markdown / plain)
      - `sections` (jsonb) — array of { heading, body, image? }
      - `faq` (jsonb) — array of { question, answer }
      - `images` (jsonb) — array of { url, alt, caption? }
      - `competitors` (jsonb) — array of competitor research objects
      - `backlinks` (jsonb) — array of { url, anchor, note? }
      - `target_location` (text)
      - `target_keyword` (text)
      - `published` (boolean, default false)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - RLS enabled
    - Public can SELECT published pages (for public rendering)
    - Authenticated users (admins) have full access
*/

CREATE TABLE IF NOT EXISTS seo_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  meta_description text NOT NULL DEFAULT '',
  meta_keywords text NOT NULL DEFAULT '',
  canonical_url text NOT NULL DEFAULT '',
  og_image text NOT NULL DEFAULT '',
  hero_image text NOT NULL DEFAULT '',
  h1 text NOT NULL DEFAULT '',
  intro text NOT NULL DEFAULT '',
  content text NOT NULL DEFAULT '',
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  faq jsonb NOT NULL DEFAULT '[]'::jsonb,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  competitors jsonb NOT NULL DEFAULT '[]'::jsonb,
  backlinks jsonb NOT NULL DEFAULT '[]'::jsonb,
  target_location text NOT NULL DEFAULT '',
  target_keyword text NOT NULL DEFAULT '',
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seo_pages_slug_idx ON seo_pages (slug);
CREATE INDEX IF NOT EXISTS seo_pages_published_idx ON seo_pages (published);

ALTER TABLE seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published seo pages"
  ON seo_pages
  FOR SELECT
  TO anon
  USING (published = true);

CREATE POLICY "Authenticated can read all seo pages"
  ON seo_pages
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated can insert seo pages"
  ON seo_pages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can update seo pages"
  ON seo_pages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated can delete seo pages"
  ON seo_pages
  FOR DELETE
  TO authenticated
  USING (true);
