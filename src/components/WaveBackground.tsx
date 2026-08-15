import { CurrentField } from './brand/CurrentField';

export default function WaveBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ color: 'var(--nw-current-navy)', zIndex: 0 }}
    >
      <CurrentField density="subtle" tone="light" className="absolute inset-0 h-full w-full opacity-40" />
    </div>
  );
}
