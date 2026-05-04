type Status = 'operational' | 'degraded' | 'down';

interface StatusService {
  name: string;
  category: 'saas' | 'isp';
  status: Status;
  uptime: number;
  lastChecked: string;
}

const getStatusColor = (status: Status) => {
  switch (status) {
    case 'operational': return '#5EBC67';
    case 'degraded': return '#FFA500';
    case 'down': return '#FF6B6B';
  }
};

const getStatusLabel = (status: Status) => {
  switch (status) {
    case 'operational': return 'Operational';
    case 'degraded': return 'Degraded';
    case 'down': return 'Down';
  }
};

export default function StatusIndicator({ service }: { service: StatusService }) {
  const color = getStatusColor(service.status);
  const label = getStatusLabel(service.status);

  return (
    <div
      className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'rgba(26, 47, 63, 0.8)',
        border: `1px solid ${color}40`,
        boxShadow: `0 2px 12px ${color}20`,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-1" style={{ color: '#E0F2F1' }}>
              {service.name}
            </h3>
            <p className="text-xs" style={{ color: 'rgba(224,242,241,0.65)' }}>
              {service.category === 'saas' ? 'SaaS Service' : 'Internet Service'}
            </p>
          </div>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap ml-2"
          style={{ background: `${color}15`, color }}
        >
          {label}
        </span>
      </div>

      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs" style={{ color: 'rgba(224,242,241,0.7)' }}>
            Uptime
          </span>
          <span className="text-sm font-bold" style={{ color: '#E0F2F1' }}>
            {service.uptime}%
          </span>
        </div>
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(224,242,241,0.2)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${service.uptime}%`,
              background: color,
            }}
          />
        </div>
        <div className="text-[10px]" style={{ color: 'rgba(224,242,241,0.55)' }}>
          Last checked: {service.lastChecked}
        </div>
      </div>
    </div>
  );
}
