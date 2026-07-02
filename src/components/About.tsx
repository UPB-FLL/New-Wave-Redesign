import { useContent } from '../lib/useContent';
import { Shield, Users, Award, Zap } from 'lucide-react';

export default function About({ headlineAs: HeadlineTag = 'h2' }: { headlineAs?: 'h1' | 'h2' } = {}) {
  const c = useContent('about');

  return (
    <section id="about" className="bg-white py-12 sm:py-16 lg:py-28 relative" style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Story Section */}
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center mb-16 sm:mb-24">
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(21,34,50,0.12)' }}>
              <img
                src="https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="New Wave IT team at work"
                className="w-full h-full object-cover"
                width={900}
                height={675}
                loading="lazy"
                decoding="async"
              />
            </div>

            <div
              className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 rounded-2xl p-4 sm:p-6"
              style={{ background: '#39CCCC', boxShadow: '0 16px 48px rgba(57,204,204,0.4)' }}
            >
              <div
                className="font-bold text-white"
                style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", fontSize: '2rem', lineHeight: 1 }}
              >
                {c.years_badge || '15+'}
              </div>
              <div className="text-xs sm:text-sm mt-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
                {c.years_label || 'Years Serving\nSouth Florida'}
              </div>
            </div>
          </div>

          <div>
            <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
              {c.section_label || 'About Us'}
            </span>
            <HeadlineTag
              className="text-4xl sm:text-5xl lg:text-7xl mt-2 mb-4 sm:mb-6 leading-[0.95] tracking-tight"
              style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
            >
              {c.headline && c.headline_accent ? (
                <>
                  {c.headline}{' '}
                  <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{c.headline_accent}</span>
                </>
              ) : (
                <>
                  Fort Lauderdale's{' '}
                  <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>trusted IT partner</span>
                </>
              )}
            </HeadlineTag>
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed mb-3 sm:mb-5" style={{ color: 'rgba(21,34,50,0.65)' }}>
              {c.paragraph1 || "New Wave IT was founded with a simple mission: provide businesses across South Florida with enterprise-grade IT support they can actually rely on — without the enterprise price tag."}
            </p>
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed mb-3 sm:mb-5" style={{ color: 'rgba(21,34,50,0.65)' }}>
              {c.paragraph2 || "Based in Fort Lauderdale, our team of certified engineers and technology advisors has helped hundreds of businesses modernize their infrastructure, lock down their security posture, and scale their operations with confidence."}
            </p>
            <p className="text-sm sm:text-base lg:text-lg leading-relaxed" style={{ color: 'rgba(21,34,50,0.65)' }}>
              {c.paragraph3 || "We're not a faceless call center. We're your neighbors, your partners, and your biggest advocates in the world of technology."}
            </p>

            <div className="mt-6 sm:mt-8 flex items-center gap-4 sm:gap-6">
              <div className="flex -space-x-3">
                {[
                  'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=100',
                  'https://images.pexels.com/photos/3184430/pexels-photo-3184430.jpeg?auto=compress&cs=tinysrgb&w=100',
                  'https://images.pexels.com/photos/3184394/pexels-photo-3184394.jpeg?auto=compress&cs=tinysrgb&w=100',
                ].map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt="New Wave IT team member"
                    className="w-10 h-10 rounded-full object-cover"
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                    style={{ border: '2px solid white', boxShadow: '0 2px 8px rgba(21,34,50,0.1)' }}
                  />
                ))}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: '#152232' }}>{c.team_tagline || 'Our team is ready'}</div>
                <div className="text-sm" style={{ color: 'rgba(21,34,50,0.55)' }}>{c.team_sub || 'Certified engineers on standby 24/7'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Our Approach Section */}
        {(c.approach_title || c.approach_desc || true) && (
          <div className="mb-16 sm:mb-24 pb-16 sm:pb-24" style={{ borderBottom: '1px solid rgba(21,34,50,0.06)' }}>
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
              <h3
                className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4"
                style={{ color: '#152232', fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif" }}
              >
                {c.approach_title || 'Our Approach'}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>
                {c.approach_desc || 'We combine technical expertise with genuine partnership to deliver IT solutions that work.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: Shield, title: c.approach_point1_title || 'Proactive', desc: c.approach_point1_desc || 'We monitor your systems 24/7 and fix issues before they become problems.' },
                { icon: Users, title: c.approach_point2_title || 'Collaborative', desc: c.approach_point2_desc || 'Your dedicated PM is your single point of contact for all IT needs.' },
                { icon: Award, title: c.approach_point3_title || 'Certified', desc: c.approach_point3_desc || 'Microsoft, Cisco, and CompTIA certified engineers on every engagement.' },
                { icon: Zap, title: c.approach_point4_title || 'Responsive', desc: c.approach_point4_desc || 'Average response time under 1 hour, every single ticket.' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="p-5 sm:p-6 rounded-2xl text-center"
                  style={{ background: '#f8fafb', border: '1px solid rgba(21,34,50,0.06)' }}
                >
                  <div className="flex justify-center mb-3 sm:mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(57,204,204,0.1)' }}>
                      <item.icon size={24} style={{ color: '#39CCCC' }} />
                    </div>
                  </div>
                  <h4 className="font-bold text-base mb-2" style={{ color: '#152232' }}>{item.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Why Choose Us Section */}
        {(c.why_choose_title || c.why_choose_desc || true) && (
          <div>
            <div className="max-w-3xl mx-auto text-center mb-10 sm:mb-12">
              <h3
                className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-4"
                style={{ color: '#152232', fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif" }}
              >
                {c.why_choose_title || 'Why Choose New Wave IT?'}
              </h3>
              <p className="text-base sm:text-lg leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>
                {c.why_choose_desc || 'Here\'s what makes us different from other IT providers.'}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {[
                { title: c.why_reason1_title || 'Flat-Rate Pricing', desc: c.why_reason1_desc || 'No surprises. Predictable costs with no hidden fees or long-term lock-in.' },
                { title: c.why_reason2_title || 'Local Expertise', desc: c.why_reason2_desc || 'Owned and operated in Fort Lauderdale. We know your market, your challenges, your industry.' },
                { title: c.why_reason3_title || 'True Partnership', desc: c.why_reason3_desc || 'You get a dedicated PM and senior engineer who know your business inside and out.' },
              ].map((reason, i) => (
                <div
                  key={i}
                  className="p-6 sm:p-7 rounded-2xl"
                  style={{ background: 'rgba(26, 47, 63, 0.8)', border: '1px solid rgba(57,204,204,0.3)' }}
                >
                  <h4 className="font-bold text-lg mb-2" style={{ color: '#39CCCC' }}>{reason.title}</h4>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(224,242,241,0.75)' }}>{reason.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
