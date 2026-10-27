import { readFileSync } from 'node:fs';
import path from 'node:path';

let shell: string | null = null;

/**
 * The built SPA shell, dist/_shell.html (dist/index.html is the prerendered
 * homepage; vite.config.ts writes the empty shell beside it). vercel.json's
 * includeFiles ships it with api/blog-page.ts: Vercel compiles functions
 * after `vite build`, so the file exists by then. Read once per instance.
 */
export function readSpaShell(): string {
  shell ??= readFileSync(path.join(process.cwd(), 'dist', '_shell.html'), 'utf8');
  return shell;
}
