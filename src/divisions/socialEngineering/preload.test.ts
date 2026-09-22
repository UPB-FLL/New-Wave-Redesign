import { describe, expect, it } from 'vitest';
import { preloadTagsFor, type BundleChunk } from './preload';

const bundle: Record<string, BundleChunk> = {
  'assets/index-main.js': { type: 'chunk', fileName: 'assets/index-main.js', isEntry: true, facadeModuleId: '/app/src/main.tsx', imports: [] },
  'assets/Hub-1.js': {
    type: 'chunk',
    fileName: 'assets/Hub-1.js',
    facadeModuleId: '/app/src/divisions/socialEngineering/pages/SocialEngineeringHubPage.tsx',
    imports: ['assets/index-main.js', 'assets/sections-2.js'],
  },
  'assets/sections-2.js': {
    type: 'chunk',
    fileName: 'assets/sections-2.js',
    imports: ['assets/index-main.js'],
    viteMetadata: { importedCss: new Set(['assets/sections-2.css']) },
  },
  'assets/sections-2.css': { type: 'asset', fileName: 'assets/sections-2.css' },
};

describe('preloadTagsFor', () => {
  it('preloads the page chunk, its shared chunks, and their CSS — never the entry', () => {
    expect(preloadTagsFor(bundle, 'SocialEngineeringHubPage')).toEqual([
      '<link rel="stylesheet" crossorigin href="/assets/sections-2.css">',
      '<link rel="modulepreload" crossorigin href="/assets/Hub-1.js">',
      '<link rel="modulepreload" crossorigin href="/assets/sections-2.js">',
    ]);
  });

  it('returns nothing when the page is not a separate chunk', () => {
    expect(preloadTagsFor(bundle, 'SocialEngineeringContactPage')).toEqual([]);
  });
});
