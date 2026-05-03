import { useEffect, useState } from 'react';
import { fetchSectionContent, upsertManyContent } from '../../lib/content';
import SectionEditor from '../components/SectionEditor';
import EditorField from '../components/EditorField';
import FormSection from '../components/FormSection';
import { Plus, Trash2 } from 'lucide-react';

interface PricingTier {
  name: string;
  description: string;
  price: string;
  period: string;
  features: string[];
  highlight: boolean;
  accent: string;
}

export default function PricingEditor() {
  const [content, setContent] = useState<Record<string, string>>({});
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loaded, setLoaded] = useState(false);

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

  useEffect(() => {
    fetchSectionContent('pricing').then(async (data) => {
      setContent(data);
      try {
        const parsed = JSON.parse(data.tiers || '[]');
        if (parsed.length > 0) {
          setTiers(parsed);
        } else {
          setTiers(defaultTiers);
          await upsertManyContent('pricing', {
            ...data,
            section_label: data.section_label || 'Transparent Pricing',
            headline: data.headline || 'Simple, Scalable',
            headline_accent: data.headline_accent || 'Plans',
            subheadline: data.subheadline || 'Choose the perfect plan for your business. All plans include 24/7 support and regular updates.',
            tiers: JSON.stringify(defaultTiers),
          });
        }
      } catch {
        setTiers(defaultTiers);
        await upsertManyContent('pricing', {
          ...data,
          section_label: data.section_label || 'Transparent Pricing',
          headline: data.headline || 'Simple, Scalable',
          headline_accent: data.headline_accent || 'Plans',
          subheadline: data.subheadline || 'Choose the perfect plan for your business. All plans include 24/7 support and regular updates.',
          tiers: JSON.stringify(defaultTiers),
        });
      }
      setLoaded(true);
    });
  }, []);

  const set = (key: string, val: string) => setContent((prev) => ({ ...prev, [key]: val }));

  const updateTier = (index: number, field: keyof PricingTier, value: string | boolean | string[]) => {
    setTiers((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };

  const updateFeature = (tierIdx: number, featureIdx: number, value: string) => {
    setTiers((prev) =>
      prev.map((t, i) => {
        if (i !== tierIdx) return t;
        const features = [...t.features];
        features[featureIdx] = value;
        return { ...t, features };
      })
    );
  };

  const addFeature = (tierIdx: number) => {
    setTiers((prev) => prev.map((t, i) => (i === tierIdx ? { ...t, features: [...t.features, ''] } : t)));
  };

  const removeFeature = (tierIdx: number, featureIdx: number) => {
    setTiers((prev) =>
      prev.map((t, i) => {
        if (i !== tierIdx) return t;
        return { ...t, features: t.features.filter((_, j) => j !== featureIdx) };
      })
    );
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        name: 'New Plan',
        description: 'Plan description',
        price: '$99',
        period: '/month',
        features: ['Feature 1', 'Feature 2'],
        highlight: false,
        accent: '#39CCCC',
      },
    ]);
  };

  const removeTier = (index: number) => {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await upsertManyContent('pricing', {
      ...content,
      headline_accent: content.headline_accent || 'Plans',
      tiers: JSON.stringify(tiers),
    });
  };

  if (!loaded) return <div className="text-white/50">Loading...</div>;

  return (
    <SectionEditor title="Pricing Section" description="Manage pricing plans and page header text">
      <FormSection title="Page Header" subtitle="The headline and subheading displayed at the top of the pricing page">
        <EditorField label="Section Label" value={content.section_label || ''} onChange={(v) => set('section_label', v)} hint="E.g. 'Transparent Pricing'" />
        <EditorField label="Headline" value={content.headline || ''} onChange={(v) => set('headline', v)} hint="Main heading text" />
        <EditorField label="Headline Accent" value={content.headline_accent || ''} onChange={(v) => set('headline_accent', v)} hint="The word that gets gradient styling (e.g., 'Plans')" />
        <EditorField label="Subheadline" value={content.subheadline || ''} onChange={(v) => set('subheadline', v)} multiline rows={3} hint="Supporting text below the headline" />
      </FormSection>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Pricing Tiers</h2>
            <p className="text-sm text-white/50 mt-1">Create and manage your service pricing plans</p>
          </div>
          <button
            onClick={addTier}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Plan
          </button>
        </div>

        <div className="space-y-4">
          {tiers.map((tier, tierIdx) => (
            <div key={tierIdx} className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Plan {tierIdx + 1}</h3>
                  <p className="text-white/50 text-sm">{tier.name || 'Unnamed plan'}</p>
                </div>
                <button
                  onClick={() => removeTier(tierIdx)}
                  className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EditorField
                  label="Plan Name"
                  value={tier.name}
                  onChange={(v) => updateTier(tierIdx, 'name', v)}
                />
                <EditorField
                  label="Description"
                  value={tier.description}
                  onChange={(v) => updateTier(tierIdx, 'description', v)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <EditorField
                  label="Price"
                  value={tier.price}
                  onChange={(v) => updateTier(tierIdx, 'price', v)}
                  hint="E.g., '$99' or '$199-299'"
                />
                <EditorField
                  label="Billing Period"
                  value={tier.period}
                  onChange={(v) => updateTier(tierIdx, 'period', v)}
                  hint="E.g., '/month (up to 5 users)'"
                />
              </div>

              <EditorField
                label="Accent Color"
                value={tier.accent}
                onChange={(v) => updateTier(tierIdx, 'accent', v)}
                type="color"
                hint="Color used for visual accent on this plan"
              />

              <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/7.5 transition-colors">
                <input
                  type="checkbox"
                  checked={tier.highlight}
                  onChange={(e) => updateTier(tierIdx, 'highlight', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-white">Mark as Most Popular</span>
              </label>

              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">Features</h4>
                  <button
                    onClick={() => addFeature(tierIdx)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-teal-600/20 text-teal-300 hover:bg-teal-600/30 transition-colors"
                  >
                    + Add Feature
                  </button>
                </div>

                <div className="space-y-2">
                  {tier.features.map((feature, featureIdx) => (
                    <div key={featureIdx} className="flex gap-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => updateFeature(tierIdx, featureIdx, e.target.value)}
                        placeholder="Feature description"
                        className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-teal-500/50"
                      />
                      <button
                        onClick={() => removeFeature(tierIdx, featureIdx)}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors flex-shrink-0"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionEditor>
  );
}
