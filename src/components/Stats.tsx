import { FadeIn } from './ui/fade-in';
import { NumberTicker } from './ui/number-ticker';

const stats = [
  { value: 45, suffix: ' min', label: 'Avg Response Time', sub: 'median time-to-first-response' },
  { value: 2400, suffix: '+', label: 'Endpoints Managed', sub: 'monitored 24/7' },
  { value: 99.9, suffix: '%', label: 'Uptime Guarantee', sub: 'across all managed clients', decimalPlaces: 1 },
  { value: 15, suffix: '+', label: 'Years Serving South Florida', sub: 'trusted by 500+ businesses' },
];

export default function Stats() {
  return (
    <section
      className="relative py-10 sm:py-14 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f1923 0%, #152232 100%)', zIndex: 10 }}
    >
      {/* Subtle grid overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(57,204,204,1) 1px, transparent 1px), linear-gradient(90deg, rgba(57,204,204,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {stats.map((stat, i) => (
            <FadeIn key={stat.label} delay={i * 0.1}>
              <div className="text-center">
                <div
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold tabular-nums mb-1"
                  style={{
                    fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif",
                    background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  <NumberTicker
                    value={stat.value}
                    suffix={stat.suffix}
                    decimalPlaces={stat.decimalPlaces ?? 0}
                    duration={2.2}
                  />
                </div>
                <p className="text-sm sm:text-base font-semibold mb-0.5" style={{ color: 'rgba(224,242,241,0.95)' }}>
                  {stat.label}
                </p>
                <p className="text-xs" style={{ color: 'rgba(224,242,241,0.45)' }}>
                  {stat.sub}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
