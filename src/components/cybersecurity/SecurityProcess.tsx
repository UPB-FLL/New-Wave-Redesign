import { Search, FileText, Rocket, LineChart } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: Search,
    title: 'Security Assessment',
    description: 'Free comprehensive audit of your current environment. We identify gaps, vulnerabilities, and compliance risks across your entire infrastructure.',
    duration: 'Week 1',
  },
  {
    number: '02',
    icon: FileText,
    title: 'Custom Roadmap',
    description: 'Receive a prioritized remediation plan tailored to your business risks, regulatory requirements, and budget — with clear timelines and outcomes.',
    duration: 'Week 1-2',
  },
  {
    number: '03',
    icon: Rocket,
    title: 'Deploy & Configure',
    description: 'Our certified engineers handle implementation end-to-end. Zero downtime, white-glove migration, and continuous communication throughout.',
    duration: 'Week 2-4',
  },
  {
    number: '04',
    icon: LineChart,
    title: 'Monitor & Optimize',
    description: '24/7 SOC monitoring, monthly security reviews, and quarterly strategy sessions. We continuously evolve your defense posture.',
    duration: 'Ongoing',
  },
];

export default function SecurityProcess() {
  return (
    <section
      className="bg-white py-12 sm:py-16 relative"
      style={{ borderTop: '1px solid rgba(21,34,50,0.06)', zIndex: 10 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-10">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#5EBC67' }}>
            How We Engage
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 leading-tight tracking-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
          >
            From assessment to{' '}
            <span style={{ color: '#5EBC67' }}>active defense</span> in 30 days.
          </h2>
          <p className="text-sm sm:text-base max-w-2xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            A proven four-phase methodology that gets you protected fast — without
            the typical enterprise rollout drag.
          </p>
        </div>

        <div className="relative">
          {/* Connecting line - desktop only */}
          <div
            className="hidden lg:block absolute top-9 left-[12.5%] right-[12.5%] h-0.5"
            style={{
              background: 'linear-gradient(90deg, rgba(57,204,204,0.3) 0%, rgba(94,188,103,0.3) 100%)',
            }}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, idx) => {
              const isEven = idx % 2 === 0;
              const accent = isEven ? '#39CCCC' : '#5EBC67';
              return (
                <div key={step.number} className="relative">
                  {/* Number circle */}
                  <div
                    className="relative w-18 h-18 rounded-full mx-auto mb-4 flex items-center justify-center transition-transform duration-300 hover:scale-105"
                    style={{
                      background: 'white',
                      border: `2px solid ${accent}`,
                      boxShadow: `0 8px 32px ${accent}25`,
                      width: '72px',
                      height: '72px',
                    }}
                  >
                    <step.icon size={24} style={{ color: accent }} />
                    <div
                      className="absolute -top-1.5 -right-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: accent,
                        color: 'white',
                        fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif",
                      }}
                    >
                      {step.number}
                    </div>
                  </div>

                  <div className="text-center">
                    <div
                      className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mb-2"
                      style={{ background: `${accent}15`, color: accent }}
                    >
                      {step.duration}
                    </div>
                    <h3 className="font-bold text-base mb-1.5" style={{ color: '#152232' }}>
                      {step.title}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(21,34,50,0.6)' }}>
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
