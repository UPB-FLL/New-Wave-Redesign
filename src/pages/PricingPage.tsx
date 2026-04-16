import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { useContent } from '../lib/useContent';

interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
  accent: string;
}

export default function PricingPage() {
  const c = useContent('pricing');
  const [tiers, setTiers] = useState<PricingTier[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(c.tiers || '[]');
      setTiers(parsed);
    } catch {
      setTiers([]);
    }
  }, [c.tiers]);

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="pt-20">
        <section className="py-28" style={{ background: '#f8fafb', borderTop: '1px solid rgba(21,34,50,0.06)' }}>
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
                {c.section_label || 'Transparent Pricing'}
              </span>
              <h2
                className="text-4xl lg:text-5xl mt-3 mb-5 leading-tight"
                style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
              >
                {c.headline || 'Simple, Scalable'}
                <span style={{ color: '#39CCCC' }}> Pricing Plans</span>
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
                {c.subheadline || 'Choose the perfect plan for your business. All plans include 24/7 support and regular updates.'}
              </p>
            </div>

            {tiers.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: 'rgba(21,34,50,0.6)' }}>No pricing tiers configured yet.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {tiers.map((tier, idx) => (
                  <div
                    key={idx}
                    className={`rounded-2xl p-8 transition-all duration-300 ${
                      tier.highlight ? 'ring-2 shadow-2xl transform -translate-y-2' : 'shadow-lg'
                    }`}
                    style={{
                      background: 'white',
                      borderColor: tier.highlight ? tier.accent : 'rgba(21,34,50,0.07)',
                      border: tier.highlight ? `2px solid ${tier.accent}` : '1px solid rgba(21,34,50,0.07)',
                    }}
                  >
                    {tier.highlight && (
                      <div
                        className="text-xs font-semibold uppercase tracking-widest mb-4 px-3 py-1 rounded-full w-fit"
                        style={{ background: `${tier.accent}20`, color: tier.accent }}
                      >
                        Most Popular
                      </div>
                    )}
                    <h3 className="text-2xl font-bold mb-2" style={{ color: '#152232' }}>
                      {tier.name}
                    </h3>
                    <p className="text-sm mb-6" style={{ color: 'rgba(21,34,50,0.6)' }}>
                      {tier.description}
                    </p>

                    <div className="mb-6">
                      <span className="text-5xl font-bold" style={{ color: tier.accent }}>
                        {tier.price}
                      </span>
                      <span className="text-sm ml-2" style={{ color: 'rgba(21,34,50,0.6)' }}>
                        {tier.period}
                      </span>
                    </div>

                    <button
                      className="w-full text-white font-semibold py-3 rounded-xl transition-all duration-200 mb-8 hover:-translate-y-1"
                      style={{
                        background: tier.accent,
                        boxShadow: `0 4px 16px ${tier.accent}40`,
                      }}
                    >
                      Get Started
                    </button>

                    <div className="space-y-4">
                      {tier.features.map((feature, featureIdx) => (
                        <div key={featureIdx} className="flex items-start gap-3">
                          <Check size={20} style={{ color: tier.accent, flexShrink: 0, marginTop: '2px' }} />
                          <span style={{ color: '#152232' }}>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
