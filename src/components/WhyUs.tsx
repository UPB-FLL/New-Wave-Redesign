import { Clock, Award, Users, Lightbulb, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useContent } from '../lib/useContent';
import { FadeIn } from './ui/fade-in';
import { FADE_UP, DURATION, EASE, STAGGER_CONTAINER } from '../lib/animation';

type FeatureCard = { title: string; desc: string };

const iconList = [Clock, Award, Users, Lightbulb, CheckCircle2, Award];
const accentList = ['#39CCCC', '#5EBC67', '#39CCCC', '#5EBC67', '#39CCCC', '#5EBC67'];

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
  { title: 'Security & Compliance', desc: 'HIPAA, SOC 2, and industry-specific compliance expertise to keep your data protected and audit-ready.' },
  { title: 'Cloud Migration & Integration', desc: 'Seamless transitions to cloud platforms with zero downtime, plus integration with your existing systems.' },
];

export default function WhyUs() {
  const c = useContent('whyus');
  const reduced = useReducedMotion();
  const navigate = useNavigate();

  let proofPoints: string[] = defaultProofPoints;
  let cards: FeatureCard[] = defaultCards;
  try { if (c.proof_points) proofPoints = JSON.parse(c.proof_points); } catch { /* use default */ }
  try {
    if (c.feature_cards) {
      const dbCards = JSON.parse(c.feature_cards);
      cards = dbCards.length > 0 ? dbCards : defaultCards;
      if (cards.length < defaultCards.length) {
        cards = [...cards, ...defaultCards.slice(cards.length)];
      }
    }
  } catch { /* use default */ }

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
          {/* Left column */}
          <FadeIn>
            <div>
              <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
                {c.section_label || 'Why New Wave IT'}
              </span>
              <h2
                className="text-4xl sm:text-5xl lg:text-7xl mt-2 mb-4 leading-[0.95] tracking-tight"
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
                onClick={() => navigate('/contact')}
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
          </FadeIn>

          {/* Right column — staggered feature cards with border-glow hover */}
          {reduced ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              {cards.map((feature, i) => {
                const Icon = iconList[i % iconList.length];
                const accent = accentList[i % accentList.length];
                return (
                  <div
                    key={feature.title}
                    className="group rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 cursor-default"
                    style={{ background: 'rgba(26, 47, 63, 0.8)', border: `1px solid ${accent}40`, boxShadow: `0 2px 12px ${accent}10` }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${accent}30`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${accent}80`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${accent}10`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
                    }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}30` }}>
                      <Icon size={18} style={{ color: accent }} />
                    </div>
                    <h3 className="font-bold text-base mb-1.5" style={{ color: '#E0F2F1' }}>{feature.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,242,241,0.75)' }}>{feature.desc}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={STAGGER_CONTAINER}
            >
              {cards.map((feature, i) => {
                const Icon = iconList[i % iconList.length];
                const accent = accentList[i % accentList.length];
                return (
                  <motion.div
                    key={feature.title}
                    className="group relative rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:-translate-y-1 cursor-default overflow-hidden"
                    style={{ background: 'rgba(26, 47, 63, 0.8)', border: `1px solid ${accent}40`, boxShadow: `0 2px 12px ${accent}10` }}
                    variants={{
                      hidden: FADE_UP.hidden,
                      visible: { ...FADE_UP.visible, transition: { duration: DURATION.base, ease: EASE.out } },
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${accent}35`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${accent}80`;
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 12px ${accent}10`;
                      (e.currentTarget as HTMLElement).style.borderColor = `${accent}40`;
                    }}
                  >
                    {/* Aceternity-style inner glow on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                      style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${accent}18 0%, transparent 70%)` }}
                    />
                    <div className="relative z-10">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: `${accent}30` }}>
                        <Icon size={18} style={{ color: accent }} />
                      </div>
                      <h3 className="font-bold text-base mb-1.5" style={{ color: '#E0F2F1' }}>{feature.title}</h3>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(224,242,241,0.75)' }}>{feature.desc}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* How It Works Section */}
      {(c.how_it_works_title || c.how_it_works_desc || true) && (
        <section className="py-12 sm:py-16 lg:py-24 relative" style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeIn>
              <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
                <h3
                  className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4"
                  style={{ color: '#152232', fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif" }}
                >
                  {c.how_it_works_title || 'How It Works'}
                </h3>
                <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>
                  {c.how_it_works_desc || 'A simple, straightforward process to get your technology working better.'}
                </p>
              </div>
            </FadeIn>

            <motion.div
              className="grid md:grid-cols-3 gap-6 sm:gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-60px' }}
              variants={STAGGER_CONTAINER}
            >
              {[
                { step: '1', title: c.how_step1_title || 'Assessment', desc: c.how_step1_desc || 'We audit your current setup, identify gaps, and understand your business priorities.' },
                { step: '2', title: c.how_step2_title || 'Planning', desc: c.how_step2_desc || 'Together we create a roadmap that aligns technology with your business goals.' },
                { step: '3', title: c.how_step3_title || 'Implementation & Support', desc: c.how_step3_desc || 'We execute the plan and stay with you through every step of the journey.' },
              ].map((item) => (
                <motion.div
                  key={item.step}
                  className="relative p-6 sm:p-7 rounded-2xl text-center"
                  style={{ background: 'white', border: '1px solid rgba(21,34,50,0.06)', boxShadow: '0 4px 12px rgba(21,34,50,0.06)' }}
                  variants={{
                    hidden: FADE_UP.hidden,
                    visible: { ...FADE_UP.visible, transition: { duration: DURATION.base, ease: EASE.out } },
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-lg text-white"
                    style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)' }}
                  >
                    {item.step}
                  </div>
                  <h4 className="font-bold text-lg mb-2" style={{ color: '#152232' }}>{item.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>{item.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
      )}
    </section>
  );
}
