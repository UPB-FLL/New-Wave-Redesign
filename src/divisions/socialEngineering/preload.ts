// Build-time helper: the <link> tags a prerendered division page needs so its
// lazily loaded page code downloads in parallel with the main bundle, instead
// of only after the main bundle has run (which would delay first paint).

/** The slice of a Rollup output chunk this helper reads. */
export interface BundleChunk {
  type: 'chunk' | 'asset';
  fileName: string;
  isEntry?: boolean;
  facadeModuleId?: string | null;
  imports?: string[];
  viteMetadata?: { importedCss?: Set<string> };
}

import {
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_CONTACT_US_PATH,
  DIVISION_CUSTOMERS_PATH,
  DIVISION_SERVICE_SLUGS,
  divisionServicePath,
} from './site';

export type DivisionPageModule =
  | 'SocialEngineeringHubPage'
  | 'SocialEngineeringServicePage'
  | 'SocialEngineeringCustomersPage'
  | 'SocialEngineeringContactUsPage'
  | 'SocialEngineeringContactPage';

const PAGE_MODULES = new Map<string, DivisionPageModule>([
  [DIVISION_BASE_PATH, 'SocialEngineeringHubPage'],
  ...DIVISION_SERVICE_SLUGS.map((slug): [string, DivisionPageModule] => [divisionServicePath(slug), 'SocialEngineeringServicePage']),
  [DIVISION_CUSTOMERS_PATH, 'SocialEngineeringCustomersPage'],
  [DIVISION_CONTACT_US_PATH, 'SocialEngineeringContactUsPage'],
  [DIVISION_CONTACT_PATH, 'SocialEngineeringContactPage'],
]);

/**
 * The page module (pages/<name>.tsx) that renders a division URL. Throws for
 * an unmapped URL, so a new page cannot ship preloading the wrong chunk.
 */
export function divisionPageModule(pagePath: string): DivisionPageModule {
  const module = PAGE_MODULES.get(pagePath);
  if (!module) throw new Error(`No division page module is mapped to ${pagePath} (src/divisions/socialEngineering/preload.ts).`);
  return module;
}

/**
 * modulepreload / stylesheet tags for a page module's chunk and its static
 * imports. Entry chunks are skipped (index.html already loads them). Returns
 * [] if the module is not a separate chunk, e.g. if it stops being lazy.
 */
export function preloadTagsFor(bundle: Record<string, BundleChunk>, module: DivisionPageModule, base = '/'): string[] {
  const chunks = Object.values(bundle).filter((item) => item.type === 'chunk');
  const root = chunks.find((chunk) => chunk.facadeModuleId?.replace(/\\/g, '/').endsWith(`/pages/${module}.tsx`));
  if (!root) return [];

  const byName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]));
  const scripts: string[] = [];
  const styles = new Set<string>();
  const visit = (chunk: BundleChunk) => {
    if (chunk.isEntry || scripts.includes(chunk.fileName)) return;
    scripts.push(chunk.fileName);
    chunk.viteMetadata?.importedCss?.forEach((css) => styles.add(css));
    chunk.imports?.forEach((name) => {
      const imported = byName.get(name);
      if (imported) visit(imported);
    });
  };
  visit(root);

  return [
    ...[...styles].map((css) => `<link rel="stylesheet" crossorigin href="${base}${css}">`),
    ...scripts.map((js) => `<link rel="modulepreload" crossorigin href="${base}${js}">`),
  ];
}
