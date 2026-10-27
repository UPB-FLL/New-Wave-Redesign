import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cmsHeadline } from './cmsHeadline';

const text = (node: ReturnType<typeof cmsHeadline>) => render(<h2>{node}</h2>).container.textContent;

describe('cmsHeadline', () => {
  it('never appends the default title to a CMS headline (production printed "trusted IT partner trusted IT partner")', () => {
    expect(text(cmsHeadline({ headline: "Fort Lauderdale's trusted IT partner" }, "Fort Lauderdale's trusted IT partner"))).toBe(
      "Fort Lauderdale's trusted IT partner",
    );
    expect(text(cmsHeadline({ headline: "Don't let your IT needs get lost in the current." }, 'Built for businesses that need continuity'))).toBe(
      "Don't let your IT needs get lost in the current.",
    );
  });

  it('adds the accent the CMS sets, and falls back to the default only without a CMS headline', () => {
    expect(text(cmsHeadline({ headline: 'IT services built for', headline_accent: 'modern business' }, 'Default'))).toBe('IT services built for modern business');
    expect(text(cmsHeadline({}, 'Default title'))).toBe('Default title');
  });
});
