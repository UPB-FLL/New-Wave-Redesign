// @vitest-environment node
// The build renders service pages under Node, with the real Navbar and Footer
// (src/lib/prerenderBody.tsx). A page that uses every long-form field has to
// pass what prerenderBody.test.tsx asks of each static page.

import { Headphones } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ServiceCategoryPage, type ServiceCategoryPageData } from './ServiceCategoryPage';

const page: ServiceCategoryPageData = {
  icon: Headphones,
  name: 'IT Support',
  description: 'Help desk, remote, and on-site IT support.',
  details: 'New Wave IT supports offices from 710 NW 5th Ave in Fort Lauderdale.',
  highlights: ['24/7 help desk access'],
  seoLink: '/pricing',
  overviewTitle: 'What is IT support?',
  overviewBody: ['The help desk takes requests by phone, email, or ticket.'],
  sections: [{ title: 'How pricing works', body: ['Every monthly rate is on the published price list.'], items: ['A written quote.'] }],
  faqs: [{ question: 'Is there a long-term contract?', answer: 'No. Support runs without a long-term contract.' }],
  relatedLinks: [{ label: 'Pricing', href: '/pricing', description: 'The published monthly rates.' }],
};

describe('ServiceCategoryPage in the build-time render', () => {
  const html = renderToString(
    <StaticRouter location="/it-support">
      <ServiceCategoryPage data={page} />
    </StaticRouter>,
  );

  it('renders without a browser, with one H1 and no script', () => {
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).not.toContain('<script');
    expect(html).not.toMatch(/opacity:\s*0[;"]/);
    expect(html).not.toMatch(/translateY\(\d+px\)/);
  });

  it('carries the question, its answer and the related link as plain markup', () => {
    expect(html).toMatch(/<h2[^>]*>What is IT support\?<\/h2>/);
    expect(html).toMatch(/<p[^>]*>The help desk takes requests by phone, email, or ticket\.<\/p>/);
    expect(html).toMatch(/<p[^>]*>Every monthly rate is on the published price list\.<\/p>/);
    expect(html).toMatch(/<h2[^>]*>Frequently asked questions<\/h2>/);
    expect(html).toMatch(/<h3[^>]*>Is there a long-term contract\?<\/h3><p[^>]*>No\. Support runs without a long-term contract\.<\/p>/);
    expect(html).toMatch(/<a[^>]*href="\/pricing"[^>]*>Pricing<svg/);
    expect(html).not.toContain('<details');
  });
});
