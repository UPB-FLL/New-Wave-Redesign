import { readFileSync } from 'node:fs';
import path from 'node:path';

let shell: string | null = null;

/**
 * The built SPA shell, dist/index.html. vercel.json's includeFiles ships it
 * with api/blog-page.ts: Vercel compiles functions after `vite build`, so the
 * file exists by then. Read once per instance.
 */
export function readSpaShell(): string {
  shell ??= readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf8');
  return shell;
}
