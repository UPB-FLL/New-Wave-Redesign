import { Clock, Award, Users, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
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
  'Proactive — we fix issues before you notice',
];

const defaultCards: FeatureCard[] = [
  { title: '24/7 Service & Monitoring', desc: 'Round-the-clock monitoring and support so issues are caught and resolved before they impact your business.' },
  { title: 'Industry-Certified Engineers', desc: 'Microsoft, Cisco, and CompTIA certified engineers with deep expertise across platforms.' },
  { title: 'Dedicated Project Managers', desc: 'Every engagement comes with a dedicated PM keeping timelines and deliverables on track.' },
  { title: 'Strategic Tech Advisors', desc: 'We align your technology investments with your business goals for long-term success.' },
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
      className="py-12 sm:py-16 relative"
      style={{
        background: '#f8fafb',
        borderTop: '1px solid rgba(21,34,50,0.06)',
        borderBottom: '1px solid rgba(21,34,50,0.06)',
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 items-start">
          <div>
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
              {c.section_label || 'Why New Wave IT'}
            </span>
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 leading-tight tracking-tight"
              style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
            >
              {c.headline && c.headline_accent ? (
                <>
                  {c.headline}{' '}
                  <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{c.headline_accent}</span>
                </>
              ) : (
                <>
                  Built for businesses that{' '}
                  <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>can't afford downtime.</span>
                </>
              )}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed mb-5 sm:mb-6" style={{ color: 'rgba(21,34,50,0.6)' }}>
              {c.subheadline || "We don't just fix problems — we build long-term partnerships that keep your business technology running at its best."}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 mb-6 sm:mb-7">
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-2 p-2.5 rounded-lg"
                  style={{ background: 'white', border: '1px solid rgba(21,34,50,0.06)' }}
                >
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0" style={{ color: '#5EBC67' }} />
                  <span className="text-sm" style={{ color: 'rgba(21,34,50,0.75)' }}>{point}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const el = document.querySelector('#contact');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                boxShadow: '0 8px 24px rgba(57,204,204,0.3)',
              }}
            >
              {c.cta_label || 'Schedule a Free Assessment'}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            {cards.map((feature, i) => {
              const Icon = iconList[i % iconList.length];
              const accent = accentList[i % accentList.length];
              return (
                <div
                  key={feature.title}
                  className="group rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 cursor-default"
                  style={{
                    background: 'white',
                    border: '1px solid rgba(21,34,50,0.07)',
                    boxShadow: '0 2px 12px rgba(21,34,50,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${accent}20`;
                    (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.04)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.07)';
                  }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}15` }}>
                    <Icon size={18} style={{ color: accent }} />
                  </div>
                  <h3 className="font-bold text-base mb-1.5" style={{ color: '#152232' }}>{feature.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
