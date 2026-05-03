import { useContent } from '../lib/useContent';

export default function About() {
  const c = useContent('about');

  return (
    <section id="about" className="bg-white py-12 sm:py-16 lg:py-28 relative" style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-10 sm:gap-12 lg:gap-16 items-center">
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden" style={{ boxShadow: '0 24px 64px rgba(21,34,50,0.12)' }}>
              <img
                src="https://images.pexels.com/photos/1181316/pexels-photo-1181316.jpeg?auto=compress&cs=tinysrgb&w=900"
                alt="New Wave IT team at work"
                className="w-full h-full object-cover"
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
            <h2
              className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 sm:mb-6 leading-tight tracking-tight"
              style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
            >
              {c.headline ? (
                c.headline
              ) : (
                <>
                  Fort Lauderdale's{' '}
                  <span style={{ display: 'inline-block', background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>trusted IT partner</span>
                </>
              )}
            </h2>
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
                    alt="Team member"
                    className="w-10 h-10 rounded-full object-cover"
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
      </div>
    </section>
  );
}
