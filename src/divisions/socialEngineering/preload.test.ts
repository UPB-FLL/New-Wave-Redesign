import { existsSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { divisionPageModule, preloadTagsFor, type BundleChunk } from './preload';
import { allDivisionPages } from './seo';
import { DIVISION_CONTACT_US_PATH, DIVISION_CUSTOMERS_PATH } from './site';

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

describe('divisionPageModule', () => {
  it('maps every division URL to a page module that exists', () => {
    allDivisionPages().forEach((page) => {
      const module = divisionPageModule(page.path);
      expect(existsSync(path.resolve(__dirname, 'pages', `${module}.tsx`)), `${page.path} → ${module}`).toBe(true);
    });
    expect(divisionPageModule(DIVISION_CUSTOMERS_PATH)).toBe('SocialEngineeringCustomersPage');
    expect(divisionPageModule(DIVISION_CONTACT_US_PATH)).toBe('SocialEngineeringContactUsPage');
  });

  it('fails the build for a URL with no page module, instead of preloading the wrong chunk', () => {
    expect(() => divisionPageModule('/social-engineering/not-a-page')).toThrow(/No division page module/);
  });
});
