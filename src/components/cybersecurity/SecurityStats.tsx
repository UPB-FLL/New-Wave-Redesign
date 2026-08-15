import { Activity, Award, Clock, ShieldCheck, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '../brand/SectionHeading';

const stats: { icon: LucideIcon; number: string; label: string; description: string }[] = [
  { icon: Activity, number: '99.99%', label: 'Uptime SLA', description: 'Backed by a financial guarantee' },
  { icon: Clock, number: '<5 min', label: 'Mean Time to Detect', description: 'A rapid, measured response' },
  { icon: ShieldCheck, number: '15M+', label: 'Threats Blocked', description: 'Across protected networks' },
  { icon: Award, number: '500+', label: 'Businesses Protected', description: 'Across South Florida' },
];

export default function SecurityStats() {
  return (
    <section className="bg-[var(--nw-cloud-white)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="By the Numbers"
          title={<>Performance metrics for <span className="text-[var(--nw-tide-blue)]">serious security.</span></>}
        />
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <article key={stat.label} className="rounded-lg border p-5" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
                <p className="nw-display mt-5 text-3xl text-[var(--nw-current-navy)]">{stat.number}</p>
                <h3 className="mt-2 text-sm font-bold text-[var(--nw-current-navy)]">{stat.label}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--nw-slate)]">{stat.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
