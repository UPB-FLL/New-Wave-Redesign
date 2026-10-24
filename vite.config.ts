/// <reference types="vitest/config" />

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createServer, defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { divisionPageModule, preloadTagsFor, type BundleChunk } from './src/divisions/socialEngineering/preload';
import { renderDivisionPageHtml } from './src/divisions/socialEngineering/prerender';
import { allDivisionPages } from './src/divisions/socialEngineering/seo';
import { DIVISION_PUBLISHED } from './src/divisions/socialEngineering/site';
import { renderRouteHtml } from './src/lib/prerenderHead';
import { prerenderedItRoutes } from './src/lib/routeMeta';

/**
 * Writes dist/<route>/index.html for every static page: the built SPA shell
 * with that page's own title, description, canonical, and Open Graph/Twitter
 * tags (src/lib/prerenderHead.ts), so crawlers that don't run JavaScript never
 * read one page as a copy of the homepage. New Wave IT routes come from
 * src/lib/routeMeta.ts; division pages also get their own JSON-LD, icons, and
 * preload links. GroundSwell's public marketing page also renders its actual
 * React content into #root so reading the page does not require JavaScript.
 * vercel.json rewrites each route to its file; the homepage and data-driven
 * routes keep the shell.
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
      for (const route of prerenderedItRoutes()) {
        write(route.path, renderRouteHtml(shell, route.path, route.meta));
      }
      if (!DIVISION_PUBLISHED) return;
      // Only this static public route needs a React server render. An isolated
      // loader avoids importing browser entrypoints, credentials, or app APIs.
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
