import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import LegalPageLayout from './LegalPageLayout';

vi.mock('../Navbar', () => ({ default: () => <nav aria-label="Primary">Navigation</nav> }));
vi.mock('../Footer', () => ({ default: () => <footer>Footer</footer> }));

describe('LegalPageLayout', () => {
  it('renders site chrome and a semantic legal document', () => {
    render(
      <MemoryRouter>
        <LegalPageLayout title="Privacy Policy" effectiveDate="August 11, 2026">
          <section aria-labelledby="collection"><h2 id="collection">Information We Collect</h2></section>
        </LegalPageLayout>
      </MemoryRouter>,
    );

    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument();
    expect(screen.getByText('Legal')).toHaveClass('text-teal-700');
    expect(screen.getByText('Legal')).not.toHaveClass('text-teal-600');
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText('Effective date: August 11, 2026')).toBeInTheDocument();
    expect(screen.getByRole('main')).toContainElement(screen.getByRole('heading', { level: 2 }));
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });
});
