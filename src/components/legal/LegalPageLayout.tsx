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
    <div className="min-h-screen relative bg-white">
      <Navbar />
      <main className="relative z-10 px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32">
        <article className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-12 lg:px-14">
          <header className="mb-10 border-b border-slate-200 pb-8">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-teal-600">Legal</p>
            <h1 className="text-4xl tracking-tight text-slate-900 sm:text-5xl">{title}</h1>
            <p className="mt-4 text-sm text-slate-500">Effective date: {effectiveDate}</p>
          </header>
          <div className="legal-document space-y-8 text-base leading-7 text-slate-700">{children}</div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
