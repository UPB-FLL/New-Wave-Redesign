# Admin Dashboard Guide

## Overview

The New Wave IT admin at `/admin` manages the site's content, the blog, the
SEO landing pages, and Groundswell. Sign in with a Supabase admin account.

## Navigation

One sidebar, four groups:

1. **Site pages**: one row per public page (Home, Services, Pricing, About and
   Why us, Contact and footer, Status). Open a row to see the editors for that
   page's blocks, in the order they appear on the page, and a "View on site"
   link that opens the page in a new tab. The row holding the editor you are
   on is always open; the others remember whether you left them open.
2. **Blog**: Posts (the list, with each post's editor opening in place, and
   the "Generate" button) and Settings.
3. **SEO**: the landing-page portal.
4. **Groundswell**: Overview, Audits, Partners.

The search box above the groups filters the sidebar as you type. It matches
editor names, the page they belong to, and the fields they hold, so "phone"
lists Hero, Contact, and Footer. Picking a result opens that editor and
clears the search.

The front page (`/admin`, "Overview") shows one card per site page with its
editors and when its content was last edited, and the Groundswell queue.

The old addresses still work: `/admin/unified` goes to the blog and
`/admin/legacy` to the front page.

## Editing content

1. Open the editor from the sidebar or the front page.
2. Change any field.
3. Save. Editors on the shared content manager (Hero, Service cards) show a
   bar at the bottom of the screen with the number of unsaved changes, a
   "Save changes" button, and "Discard"; the other editors have a "Save
   Changes" button at the top of the form. (Moving every editor onto the
   shared bar is the next phase of the rework.)

### Real-time updates

- Changes appear on the live site within 30 seconds of saving
- For immediate updates, refresh the live site page
- BroadcastChannel sync works across tabs in the same browser

### Discarding changes

Click "Discard" to revert unsaved changes and reload from the server.

## Troubleshooting

### Changes not appearing on live site

1. Verify the save completed (the bar says "Published", or the form says
   "Changes saved successfully")
2. Wait up to 30 seconds for automatic cache refresh
3. Hard refresh the live site page (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for errors

### Error during save

- Check your network connection
- Verify you're logged in
- Try discarding changes and re-editing
- Contact support if issue persists

## Content structure

Content is stored in the Supabase `site_content` table:

- `section`: Content area (hero, services, etc.)
- `key`: Field name within section
- `value`: Text or JSON string
- `updated_at`: when the row last changed (the front page reads it)

## Adding an editor

1. Create the editor in `src/admin/editors/`
2. Add a `<Route>` under `/admin` in `src/App.tsx`
3. Add an entry to `src/admin/adminNav.ts` under the site page it changes,
   with the `site_content` section it writes and the words someone would
   search for
4. `src/admin/adminNav.test.ts` fails until the route, the entry, and every
   section the public site reads agree
