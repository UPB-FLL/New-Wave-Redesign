/// <reference types="vitest/config" />

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createServer, defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { divisionPageModule, preloadTagsFor, type BundleChunk } from './src/divisions/socialEngineering/preload';
import { renderDivisionPageHtml } from './src/divisions/socialEngineering/prerender';
import { allDivisionPages } from './src/divisions/socialEngineering/seo';
import { DIVISION_PUBLISHED } from './src/divisions/socialEngineering/site';
import { readCmsContentForBuild } from './src/lib/prerenderContent';
import { renderRouteHtml } from './src/lib/prerenderHead';
import { HOME_PAGE_META, prerenderedItRoutes } from './src/lib/routeMeta';

/** Where the prerendered homepage lives; vercel.json rewrites "/" to it. The shell itself stays empty for every other fallback route. */
export const HOME_PRERENDER_ROUTE = '/_home';

/**
 * Writes dist/<route>/index.html for every static page: the built SPA shell
 * with that page's own title, description, canonical, and Open Graph/Twitter
 * tags (src/lib/prerenderHead.ts), so crawlers that don't run JavaScript never
 * read one page as a copy of the homepage. New Wave IT routes come from
 * src/lib/routeMeta.ts; division pages also get their own JSON-LD, icons, and
 * preload links. Every New Wave IT route, the homepage (written to
 * HOME_PRERENDER_ROUTE) and GroundSwell's public pages also render their
 * actual React content into #root, with the CMS copy read at build time, so
 * reading a page does not require JavaScript. vercel.json rewrites each route
 * to its file; the data-driven routes keep the shell.
 */
function prerenderPages(): Plugin {
  return {
    name: 'nw-prerender-pages',
    apply: 'build',
    async writeBundle(options, bundle) {
      const outDir = options.dir ?? path.resolve('dist');
      const shell = readFileSync(path.join(outDir, 'index.html'), 'utf8');
      const write = (route: string, html: string) => {
        const file = path.join(outDir, route.replace(/^\//, ''), 'index.html');
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, html);
      };
      // The page components read the CMS through useContent; the build seeds
      // them with the saved rows so the static copy is what visitors see.
      const env = loadEnv('production', process.cwd(), 'VITE_');
      const cmsContent = await readCmsContentForBuild({
        url: process.env.VITE_SUPABASE_URL ?? env.VITE_SUPABASE_URL,
        key: process.env.VITE_SUPABASE_ANON_KEY ?? env.VITE_SUPABASE_ANON_KEY,
      });
      if (!cmsContent) console.warn('prerender: no Supabase credentials; page bodies carry the code fallbacks, not the CMS copy.');
      // Pages are rendered with React through an isolated loader, which avoids
      // importing browser entrypoints, credentials, or app APIs.
      const renderer = await createServer({
        configFile: false,
        root: process.cwd(),
        plugins: [react()],
        // Router v7 re-exports its server components; transform both packages
        // together rather than asking Node's CJS analyzer to infer re-exports.
        ssr: {
          noExternal: ['react-router-dom', 'react-router'],
          resolve: { conditions: ['module-sync', 'module', 'import'] },
        },
        server: { middlewareMode: true, watch: null },
        appType: 'custom',
        logLevel: 'error',
      });
      try {
        const { isPrerenderedItPath, renderItBody } = await renderer.ssrLoadModule('/src/lib/prerenderBody.tsx');
        const itBody = (routePath: string) => (isPrerenderedItPath(routePath) ? (renderItBody(routePath, cmsContent) as string) : undefined);
        for (const route of prerenderedItRoutes()) {
          write(route.path, renderRouteHtml(shell, route.path, route.meta, { bodyHtml: itBody(route.path) }));
        }
        write(HOME_PRERENDER_ROUTE, renderRouteHtml(shell, '/', HOME_PAGE_META, { bodyHtml: itBody('/') }));
        if (!DIVISION_PUBLISHED) return;
        const { isGroundswellPublicPath, renderGroundswellBody } = await renderer.ssrLoadModule('/src/divisions/socialEngineering/prerenderBody.tsx');
        for (const page of allDivisionPages()) {
          const headExtras = preloadTagsFor(bundle as unknown as Record<string, BundleChunk>, divisionPageModule(page.path));
          const bodyHtml = isGroundswellPublicPath(page.path) ? (renderGroundswellBody(page.path) as string) : undefined;
          write(page.path, renderDivisionPageHtml(shell, page, { headExtras, bodyHtml }));
        }
      } finally {
        await renderer.close();
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
