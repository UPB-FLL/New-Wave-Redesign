import { Quote, Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      "New Wave IT transformed our security posture. Within 30 days we went from constant phishing incidents to zero successful attacks. Their team feels like an extension of ours.",
    author: 'Sarah Mitchell',
    title: 'Operations Director',
    company: 'Coastal Health Group',
    industry: 'Healthcare',
    accent: '#39CCCC',
  },
  {
    quote:
      "We migrated 3 offices to the cloud with zero downtime. The project management was flawless — they delivered ahead of schedule and under budget. Hard to find that today.",
    author: 'Marcus Chen',
    title: 'CFO',
    company: 'Atlantic Logistics',
    industry: 'Logistics',
    accent: '#5EBC67',
  },
  {
    quote:
      "The 24/7 support is real. We had a server issue at 2 AM on a Sunday — they had it resolved before our team arrived Monday morning. That's the kind of partner you need.",
    author: 'Jennifer Rodriguez',
    title: 'IT Manager',
    company: 'Sunshine Manufacturing',
    industry: 'Manufacturing',
    accent: '#39CCCC',
  },
];

export default function Testimonials() {
  return (
    <section
      className="py-12 sm:py-16 relative"
      style={{
        background: 'white',
        borderTop: '1px solid rgba(21,34,50,0.06)',
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            Customer Stories
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 leading-tight tracking-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
          >
            Don't take our word for it.{' '}
            <span style={{ color: '#39CCCC' }}>Take theirs.</span>
          </h2>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Real stories from South Florida businesses we've helped scale, secure, and modernize.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-5">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="group rounded-2xl p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 flex flex-col"
              style={{
                background: 'white',
                border: '1px solid rgba(21,34,50,0.08)',
                boxShadow: '0 2px 12px rgba(21,34,50,0.04)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${t.accent}20`;
                (e.currentTarget as HTMLElement).style.borderColor = `${t.accent}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.08)';
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <Quote size={24} style={{ color: t.accent, opacity: 0.3 }} />
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} size={14} fill={t.accent} stroke={t.accent} />
                  ))}
                </div>
              </div>

              <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: 'rgba(21,34,50,0.75)' }}>
                "{t.quote}"
              </p>

              <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{ background: `${t.accent}15`, color: t.accent }}
                >
                  {t.author
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate" style={{ color: '#152232' }}>
                    {t.author}
                  </div>
                  <div className="text-xs truncate" style={{ color: 'rgba(21,34,50,0.55)' }}>
                    {t.title}, {t.company}
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{ background: `${t.accent}10`, color: t.accent }}
                >
                  {t.industry}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
