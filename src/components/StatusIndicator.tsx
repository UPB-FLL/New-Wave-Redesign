type Status = 'operational' | 'degraded' | 'down';

interface StatusService {
  name: string;
  category: 'saas' | 'isp';
  status: Status;
  uptime: number;
  lastChecked: string;
}

const statusStyles: Record<Status, { label: string; color: string }> = {
  operational: { label: 'Operational', color: 'var(--nw-continuity-green)' },
  degraded: { label: 'Degraded', color: '#b54708' },
  down: { label: 'Down', color: '#b42318' },
};

export default function StatusIndicator({ service }: { service: StatusService }) {
  const status = statusStyles[service.status];

  return (
    <article className="rounded-lg p-4 nw-surface" style={{ borderColor: `color-mix(in srgb, ${status.color} 45%, var(--nw-mist-gray))` }}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: status.color }} aria-hidden="true" />
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-brand-navy">{service.name}</h3>
            <p className="mt-0.5 text-xs text-[var(--nw-slate)]">{service.category === 'saas' ? 'SaaS service' : 'Internet service'}</p>
          </div>
        </div>
        <span className="nw-meta shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold" style={{ background: `color-mix(in srgb, ${status.color} 14%, transparent)`, color: status.color }}>
          {status.label}
        </span>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--nw-slate)]">
          <span>Uptime</span>
          <span className="font-semibold text-brand-navy">{service.uptime}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full" style={{ background: 'var(--nw-mist-gray)' }}>
          <div className="h-full rounded-full transition-[width] duration-200" style={{ width: `${service.uptime}%`, background: status.color }} />
        </div>
        <p className="nw-meta text-[10px] text-[var(--nw-slate)]">Last checked: {service.lastChecked}</p>
      </div>
    </article>
  );
}
