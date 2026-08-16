# Blog Management System Design

> **Status:** Approved  
> **Date:** 2026-08-16  
> **Author:** Claude + User Collaborative Design

## Overview

A fully-automated blog management system integrated into the UnifiedAdminDashboard. AI generates SEO-optimized blog posts weekly based on New Wave IT's services plus current tech trends, using GPT-4 for trend discovery and GPT-4o-mini for content generation.

### Goals

1. **Automated Content Generation**: Weekly blog posts generated without manual intervention
2. **SEO Optimization**: All posts follow SEO best practices automatically
3. **Trend Awareness**: Content reflects current tech landscape and industry trends
4. **Admin Control**: Full management interface with manual override capabilities
5. **Service Focus**: Content relevant to New Wave IT's core services

## Architecture

### Three-Layer Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ /blog page  │  │ /blog/[slug]│  │ Admin       │        │
│  │ (list view) │  │ (individual)│  │ Dashboard   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            ↕ API Calls
┌─────────────────────────────────────────────────────────────┐
│                      API Layer                               │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ blog/generate    │  │ blog/list        │                │
│  │ (GPT-4→GPT-4o)   │  │ (paginated)      │                │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ blog/[id]        │  │ Supabase         │                │
│  │ (CRUD)           │  │ Scheduled Task   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            ↕ Queries
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              blog_posts table                           │ │
│  │  id, title, slug, content (Markdown), SEO fields,      │ │
│  │  category, tags, timestamps, author                     │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### blog_posts Table

```sql
CREATE TABLE blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text NOT NULL,              -- Markdown format
  featured_image text,
  category text NOT NULL,            -- Managed IT, Cybersecurity, Cloud, etc.
  tags text[] DEFAULT '{}',
  meta_title text,
  meta_description text,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  author text DEFAULT 'New Wave IT Team'
);

-- Indexes for performance
CREATE INDEX idx_blog_posts_published ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_posts_category ON blog_posts(category);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);

-- Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read blog posts"
  ON blog_posts FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated users can insert blog posts"
  ON blog_posts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update blog posts"
  ON blog_posts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete blog posts"
  ON blog_posts FOR DELETE TO authenticated USING (true);
```

## API Endpoints

### POST /api/blog/generate-post

**Purpose:** Generate a new blog post using AI

**Authentication:** Admin key via `x-admin-key` header

**Process:**
1. GPT-4 analyzes current trends in managed IT, cybersecurity, cloud services
2. Selects category based on rotation schedule
3. GPT-4o-mini generates full blog post in Markdown
4. Includes SEO metadata (meta title, description, keywords)
5. Suggests featured image search queries
6. Saves post to database with `status: published`

**Request Body:**
```typescript
{
  category?: string;      // Optional: force specific category
  trendFocus?: number;     // 0-1, default 0.4 (40% trend, 60% service)
}
```

**Response:**
```typescript
{
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;        // Markdown
  featured_image: string;
  category: string;
  tags: string[];
  meta_title: string;
  meta_description: string;
  published_at: string;
}
```

### GET /api/blog/list

**Purpose:** Fetch paginated list of blog posts

**Query Parameters:**
- `page`: number (default 1)
- `limit`: number (default 10)
- `category`: string (optional filter)
- `search`: string (title/excerpt search)

**Response:**
```typescript
{
  posts: Array<{
    id: string;
    title: string;
    slug: string;
    excerpt: string;
    featured_image: string;
    category: string;
    tags: string[];
    published_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

### GET /api/blog/[id]

**Purpose:** Fetch single blog post by ID

**Response:** Full post object including content

### PUT /api/blog/[id]

**Purpose:** Update existing blog post

**Request Body:** All updatable fields

**Response:** Updated post object

### DELETE /api/blog/[id]

**Purpose:** Delete a blog post

**Response:** Success confirmation

## Admin Components

### BlogPostManager (List View)

**Location:** `src/admin/blog/BlogPostManager.tsx`

**Features:**
- Paginated table of all blog posts
- Columns: title, date, category, tags, status
- Search bar for title/excerpt filtering
- Category dropdown filter
- Actions per row: Edit, Delete, Regenerate AI content
- Header: "Generate New Post" button (manual trigger)
- Loading states and error handling

**State Management:**
- Uses ContentManager for consistency
- Subscribes to blog post updates
- Optimistic UI updates

### BlogEditor (Edit/Create)

**Location:** `src/admin/blog/BlogEditor.tsx`

**Features:**
- Title input with character count
- Slug auto-generation (editable)
- Category dropdown
- Tags input (comma-separated, auto-complete)
- Excerpt textarea (character limit ~160)
- Markdown editor for content with preview
- SEO preview panel (meta title, description)
- Featured image URL input + Pexels search button
- Save/Cancel buttons

**Markdown Editor:**
- Simple textarea for MVP
- Future: syntax highlighting, toolbar

### BlogSettings

**Location:** `src/admin/blog/BlogSettings.tsx`

**Features:**
- AI model selection (GPT-4 vs GPT-4o-mini)
- Category priority weights
- Generation schedule (day of week, time)
- Trend vs service content ratio slider
- Test generation button

## Frontend Pages

### /blog (Updated)

**Changes:**
- Replace hardcoded posts array with `/api/blog/list` fetch
- Keep existing layout and styling
- Add loading skeleton
- Add error state
- Pagination for >10 posts

### /blog/[slug] (New)

**Location:** `src/pages/BlogPostPage.tsx`

**Features:**
- Fetch post by slug from `/api/blog/list` (filtered)
- Display:
  - Featured image (hero)
  - Title (H1)
  - Category badge + tags
  - Published date
  - Markdown content rendered to HTML
  - Related posts (same category)
- SEO metadata from post fields
- Share buttons
- "Back to blog" link

**Markdown Rendering:**
- Use `react-markdown` library
- Custom renderers for code blocks, links
- Table of contents generation (optional)

## AI Generation Strategy

### Category Rotation

Categories cycle weekly in this order:
1. Managed IT Services
2. Cybersecurity
3. Cloud Solutions
4. Network Infrastructure
5. Microsoft 365
6. IT Support
7. Backup & Disaster Recovery

### Content Balance

- **60% Service-focused**: Practical guidance for existing/prospective clients
- **40% Trend-focused**: Current threats, updates, industry news

### GPT-4 Trend Analysis

Prompt pattern:
```
"You are an IT industry analyst. Based on your knowledge of current trends 
through early 2026, identify 3-5 trending topics in [CATEGORY] that would be 
relevant for South Florida businesses. For each, provide:
- Topic name
- Why it's relevant now
- Key points to cover"
```

### GPT-4o-mini Content Generation

Prompt pattern:
```
"You are a senior IT content writer for New Wave IT (Fort Lauderdale MSP).
Write a comprehensive blog post about: [TOPIC]

Requirements:
- 1500-2000 words
- Professional but accessible tone
- Include practical tips
- Target: South Florida business decision makers
- SEO-optimized with natural keyword usage
- Markdown format with proper heading hierarchy
Return JSON with: title, slug, excerpt (150-160 chars), content (markdown), 
meta_title (55-60 chars), meta_description (150-160 chars), tags, 
featured_image_query, category."
```

### SEO Standards

Each generated post includes:
- Meta title: 55-60 characters
- Meta description: 150-160 characters  
- Proper H1, H2, H3 hierarchy
- Internal linking suggestions
- Category-relevant keywords
- Readable, scannable structure (short paragraphs, bullet points)

## Weekly Automation

### Supabase Scheduled Task

```sql
-- Create pgcron extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly generation (every Sunday at 2am ET)
SELECT cron.schedule(
  'weekly-blog-generation',
  '0 2 * * 0', -- Every Sunday at 2 AM
  $$
  SELECT 
    net.http_post(
      url := 'https://newwaveitfl.com/api/blog/generate-post',
      headers := jsonb_build_object('x-admin-key', current_setting('app.admin_api_key')),
      body := jsonb_build_object()
    );
  $$
);
```

**Fallback:** If scheduled task fails, manual generation always available.

## Implementation Phases

### Phase 1: Foundation (Database + Core API)
- Create `blog_posts` table migration
- Implement CRUD API endpoints
- Basic authentication
- Test with manual post creation

### Phase 2: AI Generation
- Implement `generate-post` endpoint
- GPT-4 trend analysis
- GPT-4o-mini content generation
- Pexels image integration
- Error handling and retry logic

### Phase 3: Admin Interface
- BlogPostManager component
- BlogEditor component
- BlogSettings component
- Integrate into UnifiedAdminDashboard
- Add "Blog" section to sidebar

### Phase 4: Frontend Integration
- Update `/blog` page to use API
- Create `/blog/[slug]` page
- Markdown rendering
- SEO metadata integration
- Related posts section

### Phase 5: Automation
- Supabase scheduled task setup
- Monitoring and logging
- Fallback mechanisms
- Manual trigger functionality

## Dependencies

### New NPM Packages
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown support
- `rehype-raw` - Allow HTML in markdown

### Environment Variables
- `OPENAI_API_KEY` - Already exists
- `PEXELS_API_KEY` - Already exists
- `ADMIN_API_KEY` - Already exists

## Success Criteria

1. ✅ Weekly blog posts generated automatically
2. ✅ All posts follow SEO best practices
3. ✅ Admin has full control (edit, delete, regenerate)
4. ✅ Content reflects current tech trends
5. ✅ Blog integrates seamlessly with existing site design
6. ✅ Generation fails gracefully with error logging

## Future Enhancements

- Version history for posts
- Draft workflow (before auto-publishing)
- Social media auto-posting
- A/B testing headlines
- Read time calculation
- Author profiles
- Comment system
- Email newsletter integration
