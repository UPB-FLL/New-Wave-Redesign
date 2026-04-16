export default function SecurityStats() {
  const stats = [
    { number: '99.99%', label: 'Uptime Guarantee', description: 'Continuous protection and monitoring' },
    { number: '<5min', label: 'Response Time', description: 'Instant threat detection and alerting' },
    { number: '2000+', label: 'Threats Blocked Daily', description: 'Advanced threat intelligence' },
    { number: 'ISO 27001', label: 'Certified', description: 'Industry standard compliance' },
  ];

  return (
    <section className="bg-gradient-to-b from-white to-slate-50 py-20" style={{ borderTop: '1px solid rgba(21,34,50,0.06)' }}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div
                className="text-4xl lg:text-5xl font-bold mb-2"
                style={{ fontFamily: 'Staatliches, sans-serif', color: '#39CCCC' }}
              >
                {stat.number}
              </div>
              <div className="font-semibold text-sm mb-1" style={{ color: '#152232' }}>
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
