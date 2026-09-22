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

export type DivisionPageModule =
  | 'SocialEngineeringHubPage'
  | 'SocialEngineeringServicePage'
  | 'SocialEngineeringContactPage';

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
