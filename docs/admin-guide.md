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

Every site-page editor (`/admin/hero`, `/admin/pricing`, and the rest) is
the same screen, `SectionPage`, drawn from the section's descriptor in
`src/admin/sections/descriptors.ts`.

1. Open the editor from the sidebar or the front page. The sidebar search
   also finds single fields ("phone", "tagline") and opens the editor on
   that field.
2. The section is a column of **blocks** (Headline, Buttons and phone,
   Feature cards), collapsed to a title, a one-line preview, and a field
   count. Open one; opening another closes it unless you pin it open.
3. Change any field. A block with unsaved edits shows an amber dot, and so
   does the field.
4. Lists (cards, tiers, services, threats) are **rows**: the title, a
   second line, and buttons to move, duplicate, and delete. Click a row to
   edit it in the side panel; Done or Escape closes it. Drag rows to
   reorder. An empty list offers "Start from the site's defaults", the
   built-in items the site shows when nothing is saved.
5. Save. The bar at the bottom of the screen shows the number of unsaved
   changes, "Save changes", and "Discard". It appears on every editor as
   soon as something is unsaved.

Edits survive a reload or a wrong click: they are kept in the browser
(session storage) until saved or discarded, and leaving the admin with
unsaved edits asks first. If someone else saved the same section after you
opened it, saving warns before overwriting their change.

If a stored list cannot be read (bad JSON written by hand), the editor shows
the raw value and leaves it alone; "Replace it with an empty list" is the
only way to clear it.

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

Most new content needs no new screen: add the section (or the field) to
`src/admin/sections/descriptors.ts` and `SectionPage` renders it.

1. Describe the section: `blocks`, each with `fields`. A scalar field is
   `text`, `textarea`, `number`, `color`, `select`, `checkbox`, or
   `strings` (a list of plain strings, stored as JSON). A `list` field
   holds items with their own fields, `titleKey` for the row, `newItem`,
   and optional `defaults` (the site's built-in items). The stored shape
   must match what the public component reads.
2. Add a `<Route>` under `/admin` in `src/App.tsx`:
   `<Route path="…" element={<SectionPage section="…" />} />`.
3. Add an entry to `src/admin/adminNav.ts` under the site page it changes,
   with the `site_content` section it writes and the words someone would
   search for.
4. `src/admin/adminNav.test.ts` and `src/admin/sections/sections.test.ts`
   fail until the route, the entry, the descriptor, and every key the public
   site reads agree.

An editor that is not a `site_content` section (the quote builder's units,
the blog, SEO) is its own component under `src/admin/`; put it on the
`ContentManager` only if it writes `site_content`.
