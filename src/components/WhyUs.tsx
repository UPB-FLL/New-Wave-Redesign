import { Clock, Award, Users, Lightbulb, CheckCircle2 } from 'lucide-react';
import { useContent } from '../lib/useContent';

type FeatureCard = { title: string; desc: string };

const iconList = [Clock, Award, Users, Lightbulb];
const accentList = ['#39CCCC', '#5EBC67', '#39CCCC', '#5EBC67'];

const defaultProofPoints = [
  'No long-term contracts required',
  'Flat-rate transparent pricing',
  'Local Fort Lauderdale team',
  'Average ticket resolution under 1 hour',
  'Dedicated account manager for every client',
  'Proactive — we fix issues before you notice them',
];

const defaultCards: FeatureCard[] = [
  { title: '24/7 Service & Monitoring', desc: 'Round-the-clock monitoring and support so issues are caught and resolved before they impact your business.' },
  { title: 'Industry-Certified Technicians', desc: 'Microsoft, Cisco, and CompTIA certified engineers with deep expertise across platforms.' },
  { title: 'Dedicated Project Managers', desc: 'Every engagement comes with a dedicated project manager keeping timelines and deliverables on track.' },
  { title: 'Strategic Technology Advisors', desc: 'We align your technology investments with your business goals for long-term success.' },
];

export default function WhyUs() {
  const c = useContent('whyus');

  let proofPoints: string[] = defaultProofPoints;
  let cards: FeatureCard[] = defaultCards;
  try { if (c.proof_points) proofPoints = JSON.parse(c.proof_points); } catch { /* use default */ }
  try { if (c.feature_cards) cards = JSON.parse(c.feature_cards); } catch { /* use default */ }

  return (
    <section
      id="why-us"
      className="py-28"
      style={{ background: '#f8fafb', borderTop: '1px solid rgba(21,34,50,0.06)', borderBottom: '1px solid rgba(21,34,50,0.06)' }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
              {c.section_label || 'Why New Wave IT'}
            </span>
            <h2
              className="text-4xl lg:text-5xl mt-3 mb-6 leading-tight"
              style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
            >
              {c.headline || "Don't let your IT needs get lost in the current."}
            </h2>
            <p className="text-lg leading-relaxed mb-8" style={{ color: 'rgba(21,34,50,0.6)' }}>
              {c.subheadline || "We don't just fix problems — we build long-term partnerships that keep your business technology running at its best."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {proofPoints.map((point) => (
                <div key={point} className="flex items-start gap-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" style={{ color: '#5EBC67' }} />
                  <span className="text-sm" style={{ color: 'rgba(21,34,50,0.75)' }}>{point}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const el = document.querySelector('#contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{ background: '#39CCCC', boxShadow: '0 8px 24px rgba(57,204,204,0.3)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2db8b8')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#39CCCC')}
            >
              {c.cta_label || 'Schedule a Free Assessment'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {cards.map((feature, i) => {
              const Icon = iconList[i % iconList.length];
              const accent = accentList[i % accentList.length];
              return (
                <div
                  key={feature.title}
                  className="rounded-2xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                  style={{ background: 'white', border: '1px solid rgba(21,34,50,0.07)', boxShadow: '0 2px 16px rgba(21,34,50,0.06)' }}
                >
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${accent}15` }}>
                    <Icon size={22} style={{ color: accent }} />
                  </div>
                  <h3 className="font-semibold text-base mb-2" style={{ color: '#152232' }}>{feature.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
