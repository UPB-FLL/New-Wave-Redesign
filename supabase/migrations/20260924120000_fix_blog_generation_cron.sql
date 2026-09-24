-- Weekly blog generation has failed on every run since 20260816170000
-- scheduled it: cron.job_run_details shows `schema "net" does not exist`,
-- because pg_net was never enabled. The job also posted to the apex domain
-- (which 307-redirects to www) and read its admin key from the
-- app.admin_api_key setting, which is not set.
--
-- Before applying, store the value of Vercel's ADMIN_API_KEY in Vault:
--   select vault.create_secret('<ADMIN_API_KEY value>', 'blog_admin_api_key');
-- Without it the job sends an empty key and the route answers 401.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- cron.schedule() with an existing job name replaces that job's schedule and command.
SELECT cron.schedule(
  'weekly-blog-generation',
  '0 2 * * 0', -- Sundays 02:00 UTC (Saturday 10 PM Eastern)
  $$
  SELECT net.http_post(
    url := 'https://www.newwaveitfl.com/api/blog/generate-post',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-key', coalesce(
        (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'blog_admin_api_key'),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
