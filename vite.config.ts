/// <reference types="vitest/config" />

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { renderDivisionPageHtml } from './src/divisions/socialEngineering/prerender';
import { allDivisionPages } from './src/divisions/socialEngineering/seo';

/**
 * Writes dist/social-engineering/<page>/index.html for every division URL: the
 * built SPA shell with that page's own title, canonical, Open Graph tags, and
 * JSON-LD (see src/divisions/socialEngineering/prerender.ts). vercel.json
 * rewrites each division URL to its file; every other URL keeps the shell.
 */
function divisionPrerender(): Plugin {
  return {
    name: 'nw-division-prerender',
    apply: 'build',
    writeBundle(options) {
      const outDir = options.dir ?? path.resolve('dist');
      const shell = readFileSync(path.join(outDir, 'index.html'), 'utf8');
      for (const page of allDivisionPages()) {
        const file = path.join(outDir, page.path.replace(/^\//, ''), 'index.html');
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, renderDivisionPageHtml(shell, page));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), divisionPrerender()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
