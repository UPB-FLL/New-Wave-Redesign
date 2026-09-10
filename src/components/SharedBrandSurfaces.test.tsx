import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingNav from './FloatingNav';
import StatusIndicator from './StatusIndicator';
import SupportEmailCard from './support/SupportEmailCard';
import SupportChatCard from './support/SupportChatCard';

vi.mock('../lib/useContent', () => ({ useContent: vi.fn() }));

const { useContent } = await import('../lib/useContent');

beforeEach(() => {
  vi.mocked(useContent).mockReturnValue({});
});

describe('shared New Wave IT surfaces', () => {
  it('preserves primary, support, and legal routes in the site chrome', () => {
    render(
      <MemoryRouter>
        <Navbar />
        <Footer />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole('link', { name: 'Support' }).some((link) => link.getAttribute('href') === '/support')).toBe(true);
    expect(screen.queryByRole('link', { name: 'Blog' })).not.toBeInTheDocument();
    expect(screen.queryAllByRole('link').filter((link) => link.getAttribute('href') === '/blog')).toHaveLength(0);

    [
      { name: 'Privacy Policy', href: '/privacy-policy' },
      { name: 'Terms and Conditions', href: '/terms-and-conditions' },
      { name: 'Cookie Policy', href: '/cookie-policy' },
    ].forEach(({ name, href }) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    });
  });

  it('keeps the support intake fields explicitly labeled', () => {
    render(
      <>
        <SupportEmailCard />
        <SupportChatCard />
      </>,
    );

    expect(screen.getByLabelText('Full name')).toBeRequired();
    expect(screen.getByLabelText('Email')).toBeRequired();
    expect(screen.getByLabelText('Subject')).toBeRequired();
    expect(screen.getByLabelText('What is happening?')).toBeRequired();
    expect(screen.getByLabelText(/Your name/)).toBeRequired();
    expect(screen.getByLabelText('Phone (optional)')).toBeInTheDocument();
  });

  it('keeps human-readable service status text available to assistive technology', () => {
    render(
      <StatusIndicator
        service={{
          name: 'Microsoft 365',
          category: 'saas',
          status: 'operational',
          uptime: 99.95,
          lastChecked: '2 min ago',
        }}
      />,
    );

    expect(screen.getByText('Operational')).toBeInTheDocument();
    expect(screen.getByText('SaaS service')).toBeInTheDocument();
    expect(screen.getByText('Last checked: 2 min ago')).toBeInTheDocument();
  });

  it('keeps the supplemental floating menu out of the mobile content flow', () => {
    render(
      <MemoryRouter>
        <FloatingNav />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: 'Open navigation menu' }).parentElement).toHaveClass('hidden', 'lg:flex');
  });

  it('opens a short, unscrolled floating menu with only the essential destinations', () => {
    render(
      <MemoryRouter initialEntries={['/pricing']}>
        <FloatingNav />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));

    const menu = screen.getByRole('navigation', { name: 'Quick navigation' });
    expect(menu.className).not.toMatch(/overflow|max-h/);
    expect(within(menu).getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Home',
      'Services',
      'Pricing',
      'About',
      'Support',
      'Contact',
    ]);
    expect(within(menu).getByRole('button', { name: 'Pricing' })).toHaveAttribute('aria-current', 'page');
    expect(within(menu).queryByText('Industry solutions')).not.toBeInTheDocument();
    expect(within(menu).queryByText('Blog')).not.toBeInTheDocument();
  });
});
