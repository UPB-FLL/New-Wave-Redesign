import { useEffect } from 'react';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import DynamicPricingBuilder from '../components/DynamicPricingBuilder';
import { useContent } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';

export default function PricingPage() {
  usePageMeta({
    title: 'Pricing — Transparent IT Service Plans',
    description:
      'Build your custom IT services quote. Select employees, computers, locations, and more. Get an instant estimate.',
  });
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
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="pt-20">
        <section className="py-12 sm:py-16" style={{ background: '#f8fafb', borderTop: '1px solid rgba(21,34,50,0.06)' }}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-10">
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
                {c.section_label || 'Custom Pricing'}
              </span>
              <h2
                className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 leading-tight tracking-tight"
                style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
              >
                {c.headline ? (
                  c.headline
                ) : (
                  <>
                    Build Your Custom
                    <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}> Quote</span>
                  </>
                )}
              </h2>
              <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
                {c.subheadline || 'Select the services you need and get an instant estimate. Our team will reach out with a customized proposal.'}
              </p>
            </div>

            <DynamicPricingBuilder />
          </div>
        </section>
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
