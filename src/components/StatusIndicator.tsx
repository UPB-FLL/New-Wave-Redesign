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
      className="rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 flex flex-col"
      style={{
        background: 'white',
        border: `1px solid ${color}20`,
        boxShadow: `0 2px 12px ${color}10`,
      }}
    >
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight" style={{ color: '#152232' }}>
              {service.name}
            </h3>
            <p className="text-xs" style={{ color: 'rgba(21,34,50,0.5)' }}>
              {service.category === 'saas' ? 'SaaS Service' : 'Internet Service'}
            </p>
          </div>
        </div>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap flex-shrink-0"
          style={{ background: `${color}15`, color }}
        >
          {label}
        </span>
      </div>

      <div className="space-y-1 w-full">
        <div className="flex items-center justify-between w-full">
          <span className="text-xs" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Uptime
          </span>
          <span className="text-sm font-bold" style={{ color: '#152232' }}>
            {service.uptime}%
          </span>
        </div>
        <div
          className="w-full h-1 rounded-full overflow-hidden"
          style={{ background: 'rgba(21,34,50,0.1)' }}
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${service.uptime}%`,
              background: color,
            }}
          />
        </div>
        <div className="text-[10px]" style={{ color: 'rgba(21,34,50,0.4)' }}>
          Last checked: {service.lastChecked}
        </div>
      </div>
    </div>
  );
}
