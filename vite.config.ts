/// <reference types="vitest/config" />

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { preloadTagsFor, type BundleChunk, type DivisionPageModule } from './src/divisions/socialEngineering/preload';
import { renderDivisionPageHtml } from './src/divisions/socialEngineering/prerender';
import { allDivisionPages } from './src/divisions/socialEngineering/seo';
import { DIVISION_BASE_PATH, DIVISION_CONTACT_PATH, DIVISION_PUBLISHED } from './src/divisions/socialEngineering/site';
import { renderRouteHtml } from './src/lib/prerenderHead';
import { prerenderedItRoutes } from './src/lib/routeMeta';

const pageModuleFor = (pagePath: string): DivisionPageModule =>
  pagePath === DIVISION_BASE_PATH
    ? 'SocialEngineeringHubPage'
    : pagePath === DIVISION_CONTACT_PATH
      ? 'SocialEngineeringContactPage'
      : 'SocialEngineeringServicePage';

/**
 * Writes dist/<route>/index.html for every static page: the built SPA shell
 * with that page's own title, description, canonical, and Open Graph/Twitter
 * tags (src/lib/prerenderHead.ts), so crawlers that don't run JavaScript never
 * read one page as a copy of the homepage. New Wave IT routes come from
 * src/lib/routeMeta.ts; division pages also get their own JSON-LD, icons, and
 * preload links. vercel.json rewrites each route to its file; the homepage and
 * data-driven routes keep the shell.
 */
function prerenderPages(): Plugin {
  return {
    name: 'nw-prerender-pages',
    apply: 'build',
    writeBundle(options, bundle) {
      const outDir = options.dir ?? path.resolve('dist');
      const shell = readFileSync(path.join(outDir, 'index.html'), 'utf8');
      const write = (route: string, html: string) => {
        const file = path.join(outDir, route.replace(/^\//, ''), 'index.html');
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, html);
      };
      for (const route of prerenderedItRoutes()) {
        write(route.path, renderRouteHtml(shell, route.path, route.meta));
      }
      for (const page of DIVISION_PUBLISHED ? allDivisionPages() : []) {
        const headExtras = preloadTagsFor(bundle as unknown as Record<string, BundleChunk>, pageModuleFor(page.path));
        write(page.path, renderDivisionPageHtml(shell, page, { headExtras }));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), prerenderPages()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
