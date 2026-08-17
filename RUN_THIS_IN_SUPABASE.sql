-- ========================================
-- RUN THIS IN SUPABASE DASHBOARD SQL EDITOR
-- ========================================
-- Instructions:
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Paste this entire script and run it
-- 4. Verify the blog_posts table was created in Table Editor
-- 5. Check that the sample blog post exists
-- ========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,
  featured_image text,
  category text NOT NULL,
  tags text[] DEFAULT '{}',
  meta_title text,
  meta_description text,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  author text DEFAULT 'New Wave IT Team'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read blog posts
CREATE POLICY "Anyone can read blog posts"
  ON blog_posts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Authenticated users can insert blog posts
CREATE POLICY "Authenticated users can insert blog posts"
  ON blog_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update blog posts
CREATE POLICY "Authenticated users can update blog posts"
  ON blog_posts
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete blog posts
CREATE POLICY "Authenticated users can delete blog posts"
  ON blog_posts
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_blog_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_blog_posts_updated_at();

-- Insert sample blog post for testing
INSERT INTO blog_posts (title, slug, excerpt, content, featured_image, category, tags, meta_title, meta_description)
VALUES (
  'Welcome to the New Wave IT Blog',
  'welcome-to-new-wave-it-blog',
  'Stay updated with the latest IT insights, cybersecurity tips, and technology guidance for South Florida businesses.',
  '# Welcome to Our Blog

We are excited to launch the New Wave IT blog to share insights, tips, and guidance for businesses in Fort Lauderdale and across South Florida.

## What You Will Find Here

Our blog will cover:
- **Managed IT Services**: Best practices for proactive IT support
- **Cybersecurity**: Protecting your business from evolving threats
- **Cloud Solutions**: Modernizing your infrastructure
- **Microsoft 365**: Getting the most from your productivity tools

Stay tuned for weekly updates!',
  'https://picsum.photos/seed/newwave-it-blog/1200/630',
  'Managed IT Services',
  ARRAY['IT Support', 'Technology', 'Business'],
  'New Wave IT Blog | IT Support & Insights Fort Lauderdale',
  'New Wave IT blog with managed IT services, cybersecurity, cloud, and technology insights for Fort Lauderdale businesses.'
)
ON CONFLICT (slug) DO NOTHING;

-- Schedule weekly blog generation (every Sunday at 2 AM ET)
SELECT cron.schedule(
  'weekly-blog-generation',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://newwaveitfl.com/api/blog/generate-post',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-key', current_setting('app.admin_api_key', true)
    ),
    body := jsonb_build_object(),
    timeout_milliseconds := 120000
  );
  $$
);

-- Verification queries (run these after the main script)
-- SELECT * FROM blog_posts;
-- SELECT * FROM cron.job WHERE jobname = 'weekly-blog-generation';
