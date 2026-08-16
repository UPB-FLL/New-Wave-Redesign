# Blog System Guide

## Overview

The blog system provides automated AI-generated content with full admin control. Weekly posts are generated using GPT-4o-mini for content creation with automatic trend analysis.

## Architecture

- **Database**: Supabase `blog_posts` table
- **API**: Vercel serverless functions
- **Frontend**: React components with Markdown rendering
- **Automation**: Supabase pg_cron scheduled tasks

## Content Generation

### Automatic Generation

- **Schedule**: Weekly (Sunday 2 AM ET)
- **Process**:
  1. GPT-4o-mini analyzes current trends in selected category
  2. GPT-4o-mini generates 1500-2000 word blog post
  3. Pexels provides featured image
  4. Post saves with SEO-optimized metadata
  5. Appears immediately on `/blog` page

### Manual Generation

Navigate to `/admin` → Blog → All Posts → "Generate New Post"

## Content Standards

All generated posts include:
- Proper SEO metadata (title, description, keywords)
- Markdown formatting with heading hierarchy
- Category-relevant content for South Florida businesses
- Actionable insights and practical tips
- Internal linking suggestions
- Featured images with alt text

## Categories

Posts rotate through:
1. Managed IT Services
2. Cybersecurity
3. Cloud Solutions
4. Network Infrastructure
5. Microsoft 365
6. IT Support
7. Backup & Disaster Recovery

## Admin Usage

### Managing Blog Posts

1. **View all posts** - See paginated list with filters
2. **Edit post** - Click edit icon to modify content, SEO, images
3. **Delete post** - Click delete icon with confirmation
4. **Generate new** - Click "Generate New Post" for AI content

### AI Generation Settings

Navigate to `/admin` → Blog → Settings:

- **AI Model Selection**: Choose between GPT-4 and GPT-4o-mini
- **Content Balance**: Adjust trend vs service-focused content ratio
- **Generation Schedule**: Set day and time for automatic generation
- **Test Generation**: Generate a test post to verify settings

### Editing Blog Posts

- **Title & Slug**: Auto-generated URL from title
- **Category**: Choose from service categories
- **Tags**: Comma-separated keywords
- **Content**: Markdown format with preview
- **Featured Image**: URL or Pexels search
- **SEO**: Meta title (55-60 chars), description (150-160 chars)

## Troubleshooting

### Generation Fails

1. Check OPENAI_API_KEY environment variable
2. Verify PEXELS_API_KEY for images
3. Check Vercel function logs
4. Ensure admin API key is correct

### Posts Not Appearing

1. Check database for blog_posts table
2. Verify /api/blog/list returns posts
3. Check browser console for errors
4. Ensure migration was run

### Schedule Not Running

1. Verify pg_cron extension enabled
2. Check cron.job table in Supabase
3. Verify API endpoint is accessible
4. Check admin API key setting

## Frontend Integration

### Public Blog Pages

- `/blog` - Dynamic blog listing from database
- `/blog/:slug` - Individual post with SEO metadata

### Features

- Loading skeletons while fetching
- Error states with user feedback
- Pagination for large post lists
- Markdown rendering with proper formatting
- Related posts section
- Social sharing buttons
- Reading time estimation

## API Endpoints

### GET /api/blog/list
Fetch paginated blog posts with optional filtering.

### GET /api/blog/[id]
Fetch individual blog post by ID.

### POST /api/blog/generate-post
Generate new blog post using AI (requires admin auth).

### PUT /api/blog/[id]
Update existing blog post (requires admin auth).

### DELETE /api/blog/[id]
Delete a blog post (requires admin auth).

## Database Schema

```sql
blog_posts (
  id uuid PRIMARY KEY,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  excerpt text,
  content text NOT NULL,
  featured_image text,
  category text NOT NULL,
  tags text[],
  meta_title text,
  meta_description text,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  author text
)
```

## Migration Guide

If migrating from an existing blog system:

1. Export existing posts to CSV
2. Convert to blog_posts schema format
3. Import via Supabase dashboard or migration
4. Update slugs to match new format
5. Verify all posts appear in admin dashboard
