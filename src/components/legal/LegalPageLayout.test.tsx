import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LegalPageLayout from './LegalPageLayout';

vi.mock('../Navbar', () => ({ default: () => <nav aria-label="Primary">Navigation</nav> }));
vi.mock('../Footer', () => ({ default: () => <footer>Footer</footer> }));

describe('LegalPageLayout', () => {
  it('renders site chrome, the shared page header, and a semantic legal document', () => {
    render(
      <MemoryRouter>
        <LegalPageLayout title="Privacy Policy" effectiveDate="August 11, 2026" breadcrumbs={[{ name: 'Privacy Policy', path: '/privacy-policy' }]}>
          <section aria-labelledby="collection"><h2 id="collection">Information We Collect</h2></section>
        </LegalPageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    const trail = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(trail).getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
    expect(within(trail).getByText('Privacy Policy')).toHaveAttribute('aria-current', 'page');
    // The breadcrumb says where the page sits; no "Legal" label repeats it above the title.
    expect(screen.queryByText('Legal')).toBeNull();
    const title = screen.getByRole('heading', { level: 1, name: 'Privacy Policy' });
    expect(title.closest('header')).not.toBeNull();
    expect(screen.getByText('Effective date: August 11, 2026')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 2 }));
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
