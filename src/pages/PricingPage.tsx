import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import DynamicPricingBuilder from '../components/DynamicPricingBuilder';
import { SectionHeading } from '../components/brand/SectionHeading';
import { useContent } from '../lib/useContent';
import { IT_PAGE_META } from '../lib/routeMeta';
import { usePageMeta } from '../lib/usePageMeta';

export default function PricingPage() {
  usePageMeta(IT_PAGE_META['/pricing']);
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

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <div className="pt-20">
        <section className="py-16 sm:py-20" style={{ background: 'var(--nw-cloud-white)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeading
              as="h1"
              align="center"
              eyebrow={c.section_label || 'Custom Pricing'}
              title={<>{c.headline || 'Simple, scalable'} <span className="text-[var(--nw-tide-blue)]">{c.headline_accent || 'plans'}</span></>}
              description={c.subheadline || 'Select the services you need and get an instant estimate. Our team will follow up with a customized proposal.'}
            />

            <div className="mt-10"><DynamicPricingBuilder /></div>
          </div>
        </section>
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
