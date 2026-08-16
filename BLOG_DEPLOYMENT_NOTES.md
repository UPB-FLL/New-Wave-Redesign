# Blog System Deployment Notes

## Environment Variables Required

Ensure these are set in Vercel/Supabase:
- `OPENAI_API_KEY` - For GPT-4/GPT-4o-mini API calls
- `PEXELS_API_KEY` - For image search (optional, has fallback)
- `ADMIN_API_KEY` - For endpoint authentication

## Supabase Setup

1. Run migrations in order:
   - `20260816160000_create_blog_posts_table.sql`
   - `20260816170000_schedule_blog_generation.sql`

2. Set admin API key in Supabase:
   ```sql
   INSERT INTO core.settings (key, value) 
   VALUES ('admin_api_key', 'your-secure-key-here');
   ```

## Vercel Deployment

The API functions are automatically deployed. After deployment:
1. Test /api/blog/list returns posts
2. Test /api/blog/generate-post with POST
3. Verify scheduled task in Supabase dashboard

## Monitoring

Check logs in:
- Vercel dashboard for API endpoint errors
- Supabase dashboard for cron job execution
