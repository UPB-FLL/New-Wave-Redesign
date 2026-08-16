# Admin Dashboard Guide

## Overview

The New Wave IT admin dashboard allows you to manage all website content from a unified interface.

## Access

- **Legacy Admin:** `/admin` - Original multi-page interface
- **Unified Dashboard:** `/admin/unified` - New single-page interface

## Using the Unified Dashboard

### Navigation

The sidebar is organized into 5 sections:

1. **Homepage Content** - Hero, Trust Bar, Testimonials
2. **Services Content** - Services, Categories, Details, Threats
3. **Company Content** - Why Us, About, Pricing
4. **Contact & Footer** - Contact info, Footer content
5. **SEO & Settings** - SEO Portal, Status page

### Editing Content

1. Click a section in the sidebar to load its editor
2. Make changes to any field
3. Changes are saved locally (unsaved changes indicator appears)
4. Click "Publish Changes" to save to the live site

### Real-time Updates

- Changes to the live site appear within 30 seconds of publishing
- For immediate updates, refresh the live site page
- BroadcastChannel sync works across tabs in the same browser

### Discarding Changes

Click "Discard" to revert unsaved changes and reload from the server.

## Troubleshooting

### Changes not appearing on live site

1. Verify the publish completed successfully (check for "All changes published" message)
2. Wait up to 30 seconds for automatic cache refresh
3. Hard refresh the live site page (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for errors

### Error during publish

- Check your network connection
- Verify you're logged in
- Try discarding changes and re-editing
- Contact support if issue persists

## Content Structure

Content is stored in Supabase `site_content` table:
- `section`: Content area (hero, services, etc.)
- `key`: Field name within section
- `value`: Text or JSON string

## Current Editor Support

### Fully Integrated (Use ContentManager)
- Hero Editor
- Services Editor

### Legacy Editors (Separate Pages)
- Trust Bar
- Service Categories
- Service Details
- Threat Details
- Pricing
- Pricing Units
- Why Us
- About
- Contact
- Footer
- SEO Portal

Legacy editors will be migrated to the unified interface over time.
