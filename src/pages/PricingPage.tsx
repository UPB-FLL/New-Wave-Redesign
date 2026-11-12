import { useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import DynamicPricingBuilder from '../components/DynamicPricingBuilder';
import { PageHeader } from '../components/brand/PageHeader';
import { PublishedRates } from '../components/pricing/PublishedRates';
import { useContent } from '../lib/useContent';
import { priceListJsonLd } from '../lib/pricingSchema';
import { usePricingUnits } from '../lib/pricingUnits';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function PricingPage() {
  // The build seeds the price list, so the static HTML carries the table and
  // its Offer nodes; the browser reads the same rows from Supabase.
  const { units } = usePricingUnits();
  // Memoised: usePageMeta rewrites the JSON-LD block whenever the object changes.
  const jsonLd = useMemo(() => (units.length ? priceListJsonLd(units) : undefined), [units]);
  usePageMeta({ ...IT_PAGE_META['/pricing'], jsonLd });
  const c = useContent('pricing');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // The CMS headline is "Simple, Scalable": it was written with "plans" as its accent.
  const title = `${c.headline || 'Simple, scalable'} ${c.headline_accent || 'plans'}`;

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/pricing'].breadcrumbs}
        title={title}
        description={c.subheadline || 'Select the services you need and get an instant estimate. Our team will follow up with a customized proposal.'}
      />
      <main>
        <PublishedRates units={units} />
        <section className="relative z-10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <DynamicPricingBuilder />
            </div>
          </div>
        </section>
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
