import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import QuoteModal from '../components/QuoteModal';
import { useContent } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';

interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
  accent: string;
}

const defaultTiers: PricingTier[] = [
  {
    name: 'SaaS - Starter',
    description: 'Cloud software for small teams',
    price: '$199',
    period: '/month (up to 5 users)',
    features: ['5 user accounts', 'Cloud-based access', 'Email support (24h response)', '10GB cloud storage', 'Basic reporting', 'Monthly backups', 'API access'],
    highlight: false,
    accent: '#39CCCC',
  },
  {
    name: 'SaaS - Professional',
    description: 'Comprehensive cloud solution',
    price: '$599',
    period: '/month (up to 25 users)',
    features: ['25 user accounts', 'Multi-device sync', 'Priority support (4h response)', '250GB cloud storage', 'Advanced analytics', 'Daily automated backups', 'Custom integrations', 'Role-based access control'],
    highlight: true,
    accent: '#2db8b8',
  },
  {
    name: 'SaaS - Enterprise',
    description: 'Unlimited cloud infrastructure',
    price: '$1,299',
    period: '/month (unlimited users)',
    features: ['Unlimited user accounts', 'Real-time collaboration', '24/7 priority support (1h response)', 'Unlimited storage', 'Custom dashboards', 'Hourly backups', 'Dedicated API', 'SSO & SAML', 'Custom training'],
    highlight: false,
    accent: '#5EBC67',
  },
  {
    name: 'HaaS - Basic',
    description: 'Essential hardware support',
    price: '$299',
    period: '/month (up to 10 devices)',
    features: ['Hardware monitoring', 'Patch management', 'Remote troubleshooting', 'Email support', 'Monthly maintenance', 'Basic security updates', 'Hardware diagnostics'],
    highlight: false,
    accent: '#39CCCC',
  },
  {
    name: 'HaaS - Professional',
    description: 'Complete hardware management',
    price: '$699',
    period: '/month (up to 50 devices)',
    features: ['Full device management', 'Proactive monitoring 24/7', 'On-site support available', 'Priority phone support (2h response)', 'Weekly maintenance', 'Security compliance', 'Device lifecycle management', 'Hardware refresh planning'],
    highlight: false,
    accent: '#2db8b8',
  },
  {
    name: 'HaaS - Enterprise',
    description: 'Complete infrastructure management',
    price: '$1,499',
    period: '/month (unlimited devices)',
    features: ['Unlimited device management', 'Real-time monitoring & alerts', '24/7 on-site support', 'Dedicated account manager', 'Daily preventive maintenance', 'Compliance & security audits', 'Hardware replacement service', 'Disaster recovery planning', 'Custom SLA agreements'],
    highlight: false,
    accent: '#5EBC67',
  },
  {
    name: 'Support - Standard',
    description: 'Business hours support',
    price: '$85-150',
    period: '/hour (8am-5pm M-F)',
    features: ['Business hours availability', '24-hour response time', 'Remote support only', 'Email & phone support', 'Incident logging', 'Basic troubleshooting', 'Issue tracking'],
    highlight: false,
    accent: '#39CCCC',
  },
  {
    name: 'Support - Priority',
    description: 'Extended hours with faster response',
    price: '$125-200',
    period: '/hour (7am-9pm M-F)',
    features: ['Extended hours availability', '4-hour response time', 'Remote & on-site support', 'Priority email & phone', 'Real-time chat support', 'Advanced troubleshooting', 'Change management', 'Monthly reviews'],
    highlight: true,
    accent: '#2db8b8',
  },
  {
    name: 'Support - 24/7 Premium',
    description: 'Round-the-clock expert support',
    price: '$175-300',
    period: '/hour (24/7/365)',
    features: ['24/7/365 availability', '1-hour emergency response', 'On-site support included', 'Dedicated support team', '24/7 remote access', 'Emergency hotline', 'Proactive monitoring', 'Monthly strategy sessions', 'Quarterly reviews'],
    highlight: false,
    accent: '#5EBC67',
  },
];

export default function PricingPage() {
  usePageMeta({
    title: 'Pricing — Transparent IT Service Plans',
    description:
      'Flat-rate, transparent pricing for managed IT, hardware-as-a-service, and support plans. No long-term contracts.',
  });
  const c = useContent('pricing');
  const [tiers, setTiers] = useState<PricingTier[]>(defaultTiers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);

  const handleGetStarted = (tier: PricingTier) => {
    setSelectedTier(tier);
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (c.tiers) {
      try {
        const parsed = JSON.parse(c.tiers);
        if (parsed.length > 0) {
          setTiers(parsed);
        }
      } catch {
        setTiers(defaultTiers);
      }
    }
  }, [c.tiers]);

  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <QuoteModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} tier={selectedTier} />
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
                      onClick={() => handleGetStarted(tier)}
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
