import { Activity, Clock, ShieldCheck, Award } from 'lucide-react';

export default function SecurityStats() {
  const stats = [
    {
      icon: Activity,
      number: '99.99%',
      label: 'Uptime SLA',
      description: 'Backed by financial guarantee',
      accent: '#39CCCC',
    },
    {
      icon: Clock,
      number: '<5min',
      label: 'Mean Time to Detect',
      description: 'Industry leading response',
      accent: '#5EBC67',
    },
    {
      icon: ShieldCheck,
      number: '15M+',
      label: 'Threats Blocked',
      description: 'Across our protected networks',
      accent: '#39CCCC',
    },
    {
      icon: Award,
      number: '500+',
      label: 'Businesses Protected',
      description: 'Across South Florida',
      accent: '#5EBC67',
    },
  ];

  return (
    <section
      className="py-10 sm:py-14 relative"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafb 100%)',
        borderTop: '1px solid rgba(21,34,50,0.06)',
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            By The Numbers
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl mt-2 mb-4 leading-tight tracking-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
          >
            Performance metrics that{' '}
            <span style={{ background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>define enterprise security</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="group rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1"
              style={{
                background: 'white',
                border: '1px solid rgba(21,34,50,0.08)',
                boxShadow: '0 2px 12px rgba(21,34,50,0.04)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 48px ${stat.accent}20`;
                (e.currentTarget as HTMLElement).style.borderColor = `${stat.accent}40`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(21,34,50,0.04)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(21,34,50,0.08)';
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: `${stat.accent}15` }}
              >
                <stat.icon size={18} style={{ color: stat.accent }} />
              </div>
              <div
                className="text-3xl lg:text-4xl font-bold mb-1 tabular-nums"
                style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
              >
                {stat.number}
              </div>
              <div className="font-semibold text-sm mb-0.5" style={{ color: '#152232' }}>
                {stat.label}
              </div>
              <p className="text-xs" style={{ color: 'rgba(21,34,50,0.55)' }}>
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
