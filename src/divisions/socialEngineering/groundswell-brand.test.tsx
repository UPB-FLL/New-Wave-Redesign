import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegacyGroundswellPageRoute } from './routes';
import { groundswellPageSeo, divisionPageMetaOptions } from './seo';

function Destination() {
  const location = useLocation();
  return (
    <p>
      {location.pathname}
      {location.search}
      {location.hash}
    </p>
  );
}

describe('GroundSwell public identity', () => {
  it('redirects an old product bookmark while preserving its query and section', async () => {
    render(
      <MemoryRouter initialEntries={['/social-engineering/croissance?source=invite#reports']}>
        <Routes>
          <Route path="/social-engineering/croissance" element={<LegacyGroundswellPageRoute />} />
          <Route path="/social-engineering/groundswell" element={<Destination />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('/social-engineering/groundswell?source=invite#reports')).toBeInTheDocument();
  });

  it('publishes the new canonical name and sharing image for the app and engine', () => {
    const seo = groundswellPageSeo();
    const meta = divisionPageMetaOptions(seo);
    expect(meta.canonical).toBe('https://www.newwaveitfl.com/social-engineering/groundswell');
    expect(meta.title).toContain('GroundSwell');
    expect(meta.ogImage).toBe('https://www.newwaveitfl.com/brand/social-engineering/06_Digital/GroundSwell_OG_1200x630.png');
    expect(JSON.stringify(seo)).not.toMatch(/Croissance|French for growth/);
    expect(seo.jsonLd).toContainEqual(
      expect.objectContaining({ '@type': 'SoftwareApplication', name: 'GroundSwell', url: 'https://www.newwaveitfl.com/groundswell' }),
    );
  });
});
