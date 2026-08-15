import type { ReactNode } from 'react';
import Navbar from '../Navbar';
import Footer from '../Footer';

interface LegalPageLayoutProps {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}

export default function LegalPageLayout({ title, effectiveDate, children }: LegalPageLayoutProps) {
  return (
    <div className="relative min-h-screen" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <main className="relative z-10 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <article className="mx-auto max-w-4xl rounded-lg px-5 py-8 sm:px-10 sm:py-12 lg:px-14 nw-surface">
          <header className="mb-10 border-b pb-8" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <p className="mb-3 nw-kicker">Legal</p>
            <h1 className="nw-display text-4xl text-brand-navy sm:text-5xl">{title}</h1>
            <p className="mt-4 text-sm text-[var(--nw-slate)]">Effective date: {effectiveDate}</p>
          </header>
          <div className="legal-document space-y-8 text-base leading-7 text-[var(--nw-current-navy)]">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
