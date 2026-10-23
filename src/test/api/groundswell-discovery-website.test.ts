import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../api/_lib/groundswell/publicFetch', () => ({ readPublicText: vi.fn() }));

import { readPublicText } from '../../../api/_lib/groundswell/publicFetch';
import { inspectBusinessWebsite } from '../../../api/_lib/groundswell/discoveryWebsite';

const read = vi.mocked(readPublicText);
const website = 'https://wildlyprimal.example';
const page = (html: string, url = website, status = 200) => ({ url, status, text: html, contentType: 'text/html' });
beforeEach(() => vi.resetAllMocks());

describe('website business discovery', () => {
  it('extracts identity, address, referenced logo and canonical social profiles from a JSON-LD graph', async () => {
    const schema = { '@context': 'https://schema.org', '@graph': [
      { '@type': 'WebSite', name: 'Generic website title', url: website },
      { '@type': 'Organization', name: 'Unrelated website builder', url: 'https://builder.example' },
      { '@type': 'ExerciseGym', name: 'Wildly &amp; Primal', address: { '@id': '#address' }, logo: { '@id': '#logo' }, url: '/', sameAs: ['https://www.instagram.com/wildlyprimal/?igsh=abc', 'https://facebook.com/wildlyprimal?ref=website'] },
      { '@id': '#address', '@type': 'PostalAddress', addressLocality: 'Delray Beach', addressRegion: 'FL' },
      { '@id': '#logo', '@type': 'ImageObject', contentUrl: '/assets/brand-logo.svg' },
      { '@type': 'WebPage', publisher: { '@id': '#logo' } },
    ] };
    read.mockResolvedValueOnce(page(`<title>Home</title><link rel="icon" href="/favicon.ico"><link rel="canonical" href="/home"><script type="application/ld+json">${JSON.stringify(schema)}</script>`));
    const result = await inspectBusinessWebsite(website);
    expect(result.business).toMatchObject({ business_name: 'Wildly & Primal', city: 'Delray Beach, FL', website: `${website}/home`, instagram: 'wildlyprimal', facebook: 'https://www.facebook.com/wildlyprimal', brand_logo_url: `${website}/assets/brand-logo.svg`, category: 'Exercise Gym' });
    expect(result.scan.logo).toBe(`${website}/assets/brand-logo.svg`);
    expect(result.sources).toEqual([{ name: 'Website', status: 'ok', url: website, detail: 'Read the homepage.' }]);
    expect(result.warnings).toContain('No brand colour could be verified from the website. You can add a main colour.');
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('reads at most two same-origin stylesheets and ranks explicit primary colours above unrelated colours and neutral theme metadata', async () => {
    read.mockImplementation(async (url) => {
      if (url === website) return page('<title>Wildly Primal | Fitness</title><meta name="theme-color" content="#ffffff"><link rel="stylesheet" href="/vendor.css"><link rel="stylesheet" href="/theme.css"><link rel="stylesheet" href="/styles/extra.css"><link rel="stylesheet" href="https://cdn.example/brand.css"><style>.sale { background: #ff0000; } :root { --accent: rgb(22, 120, 180); }</style>');
      if (url === `${website}/theme.css`) return { ...page(':root { --identity: #245c38; --brand-primary: var(--identity); --text-color: #333333; }', url), contentType: 'text/css' };
      if (url === `${website}/styles/extra.css`) return { ...page(':root { --secondary: hsl(30 80% 50%); }', url), contentType: 'text/css' };
      throw new Error('Unexpected stylesheet');
    });
    const result = await inspectBusinessWebsite(website);
    expect(result.business.business_name).toBe('Wildly Primal');
    expect(result.business.brand_color).toBe('#245c38');
    expect(result.business.brand_colors).toEqual(['#245c38', '#1678b4', '#e68019', '#ff0000']);
    expect(result.business.brand_colors).not.toContain('#ffffff');
    expect(result.business.brand_colors).not.toContain('#333333');
    expect(read).toHaveBeenCalledTimes(3);
    for (const [url, options] of read.mock.calls.slice(1)) {
      expect(new URL(url).origin).toBe(website);
      expect(options).toMatchObject({ timeoutMs: 3_000, maxBytes: 150_000, contentTypes: ['text/css', 'text/plain'] });
    }
    expect(result.sources).toEqual([{ name: 'Website', status: 'ok', url: website, detail: 'Read the homepage and 2 linked stylesheets.' }]);
  });

  it('prefers the actual header logo over a footer logo and favicon, resolves relative assets, and skips share links', async () => {
    read.mockResolvedValueOnce(page(`<meta property='og:site_name' content='Wildly Primal'><link rel='icon' href='/favicon.ico'><img alt='Footer logo' src='/footer-logo.png'><header><img class='brand-logo' src='data:image/gif;base64,placeholder' data-src='../images/header-logo.svg'></header><a href='https://facebook.com/sharer/sharer.php?u=x'>Share</a><a href='https://www.facebook.com/WildlyPrimal?ref=footer'>Facebook</a><a href='https://instagram.com/p/abcdef'>Post</a><a href='https://instagram.com/wildlyprimal/'>Instagram</a>`, `${website}/about/`));
    const result = await inspectBusinessWebsite(website);
    expect(result.business.brand_logo_url).toBe(`${website}/images/header-logo.svg`);
    expect(result.business.facebook).toBe('https://www.facebook.com/WildlyPrimal');
    expect(result.business.instagram).toBe('wildlyprimal');
  });

  it('keeps missing identity and brand values null instead of supplying a guessed name, logo or fallback palette', async () => {
    read.mockResolvedValueOnce(page('<title>Home</title><style>body { background: #fff; color: #111111; }</style><script type="application/ld+json">{ malformed }</script>'));
    const result = await inspectBusinessWebsite(website);
    expect(result.business).toEqual({ business_name: null, city: null, website, instagram: null, facebook: null, brand_logo_url: null, brand_color: null, brand_colors: [], category: null });
    expect(result.warnings).toHaveLength(4);
    expect(result.sources[0].status).toBe('ok');
  });

  it('prefers a visible header wordmark when structured data labels a favicon as the logo', async () => {
    read.mockResolvedValueOnce(page('<script type="application/ld+json">{"@type":"Organization","name":"Wildly Primal","description":"A functional health coaching practice.","logo":{"@type":"ImageObject","url":"/favicon.png"}}</script><header><img class="hero-logo" src="/brand/wildly-primal-logo-light.svg" alt=""></header>'));
    const result = await inspectBusinessWebsite(website);
    expect(result.business.brand_logo_url).toBe(`${website}/brand/wildly-primal-logo-light.svg`);
    expect(result.business.category).toBe('Health coach');
    expect(result.warnings).not.toContain('Only a site icon was found. Confirm that it is suitable as the business logo.');
  });

  it('labels a favicon-only logo and a failed stylesheet as limitations without discarding observed identity', async () => {
    read.mockResolvedValueOnce(page('<title>Wildly Primal</title><link rel="apple-touch-icon" href="/touch.png"><link rel="stylesheet" href="/theme.css"><style>:root { --primary: #245c38; }</style>'))
      .mockRejectedValueOnce(new Error('Stylesheet timed out.'));
    const result = await inspectBusinessWebsite(website);
    expect(result.business.brand_logo_url).toBe(`${website}/touch.png`);
    expect(result.business.brand_color).toBe('#245c38');
    expect(result.warnings).toContain('Only a site icon was found. Confirm that it is suitable as the business logo.');
    expect(result.warnings).toContain('A linked stylesheet could not be read. Review the detected colours.');
  });

  it('reports an unavailable website honestly and does not read branding from an HTTP error page', async () => {
    read.mockResolvedValueOnce(page('<title>Hosting provider error</title><img alt="logo" src="/host-logo.png">', website, 503));
    const unavailable = await inspectBusinessWebsite(website);
    expect(unavailable.business.business_name).toBeNull();
    expect(unavailable.business.brand_logo_url).toBeNull();
    expect(unavailable.sources[0]).toMatchObject({ status: 'unavailable', detail: 'The website returned HTTP 503.' });
    read.mockRejectedValueOnce(new Error('Website timed out.'));
    const timedOut = await inspectBusinessWebsite(website);
    expect(timedOut.scan).toMatchObject({ final_url: null, status: null, error: 'Website timed out.' });
    expect(timedOut.sources[0]).toMatchObject({ status: 'unavailable', detail: 'Website timed out.' });
  });
});
