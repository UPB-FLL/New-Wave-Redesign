-- Ensure pg_cron extension is enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly blog generation (every Sunday at 2 AM ET)
-- This calls the Vercel API endpoint to generate a new blog post
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

-- Verify the scheduled job
SELECT * FROM cron.job WHERE jobname = 'weekly-blog-generation';
