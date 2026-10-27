import { ArrowRight } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { PageHeader } from '../components/brand/PageHeader';
import { Section } from '../components/brand/Section';
import { SectionHeading } from '../components/brand/SectionHeading';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import { usePageMeta } from '../lib/usePageMeta';
import { DIVISION_BASE_PATH, DIVISION_NAME, DIVISION_PUBLISHED, isDivisionPath } from '../divisions/socialEngineering/site';

const IT_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'IT services' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact us' },
];

/**
 * Every URL no route matches. The SPA answers these with HTTP 200 (vercel.json
 * rewrites everything to index.html), so the page itself tells search engines
 * not to index it; without this they got an empty page with the homepage's
 * canonical (a soft 404).
 */
export default function NotFoundPage() {
  const { pathname } = useLocation();
  usePageMeta({
    title: 'Page not found',
    description: 'The page you were looking for does not exist or has moved.',
    noindex: true,
  });

  const divisionLink = DIVISION_PUBLISHED ? [{ to: DIVISION_BASE_PATH, label: DIVISION_NAME }] : [];
  const links = isDivisionPath(pathname) ? [...divisionLink, ...IT_LINKS] : [...IT_LINKS, ...divisionLink];

  return (
    <div className="min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <PageHeader title="Page not found" description="The page you were looking for does not exist or has moved." />
      <main>
        <Section tone="white">
          <SectionHeading title="Try one of these pages" />
          <ul className="mt-8 grid max-w-3xl gap-3 sm:grid-cols-2">
            {links.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="flex items-center justify-between rounded-lg border px-4 py-3 text-[var(--nw-current-navy)] no-underline transition-colors hover:border-[var(--nw-tide-blue)]" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                  {link.label}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </main>
      <Footer />
    </div>
  );
}
