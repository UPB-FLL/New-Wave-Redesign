import type { ReactNode } from 'react';
import type { Crumb } from '../../lib/pageMeta';
import { PageHeader } from '../brand/PageHeader';
import Navbar from '../Navbar';
import Footer from '../Footer';

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  /** The page's trail below Home, as its BreadcrumbList states it. */
  breadcrumbs?: readonly Crumb[];
  children: ReactNode;
}

export default function LegalPageLayout({ title, effectiveDate, breadcrumbs, children }: LegalPageLayoutProps) {
  return (
    <div className="relative min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <PageHeader breadcrumbs={breadcrumbs} title={title} description={`Effective date: ${effectiveDate}`} />
      <main className="relative z-10 bg-[var(--nw-pure-white)] py-12 sm:py-16">
        {/* The document column starts where the page header's text does. */}
        <article className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="legal-document max-w-3xl space-y-8 text-base leading-7 text-[var(--nw-current-navy)]">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
