const stats = [
  { value: '45 min', label: 'Avg Response Time', sub: 'median time-to-first-response' },
  { value: '2400+', label: 'Endpoints Managed', sub: 'monitored 24/7' },
  { value: '99.9%', label: 'Uptime Guarantee', sub: 'across all managed clients' },
  { value: '15+', label: 'Years Serving South Florida', sub: 'trusted by 500+ businesses' },
];

export default function Stats() {
  return (
    <section
      role="region"
      aria-label="Operational proof points"
      className="relative bg-[var(--nw-deep-current)] py-8 sm:py-9"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-y-7 lg:grid-cols-4 lg:gap-y-0">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              data-role="proof-point"
              className="px-4 text-center lg:border-r lg:last:border-r-0"
              style={{ borderColor: index < stats.length - 1 ? 'var(--nw-current-navy)' : undefined }}
            >
              <p className="nw-display text-3xl tabular-nums text-[var(--nw-signal-cyan)] sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--nw-cloud-white)] sm:text-sm">{stat.label}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--nw-mist-gray)]">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
