import { FileText, LineChart, Rocket, Search, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '../brand/SectionHeading';

const steps: { icon: LucideIcon; title: string; description: string; duration: string }[] = [
  { icon: Search, title: 'Security Assessment', description: 'A comprehensive review of the environment to identify gaps, vulnerabilities, and compliance risks.', duration: 'Week 1' },
  { icon: FileText, title: 'Custom Roadmap', description: 'A prioritized remediation plan tailored to your risk, regulatory requirements, and budget.', duration: 'Week 1-2' },
  { icon: Rocket, title: 'Deploy & Configure', description: 'Certified engineers handle implementation with continuity planning and clear communication.', duration: 'Week 2-4' },
  { icon: LineChart, title: 'Monitor & Optimize', description: 'Continuous monitoring, regular reviews, and evolving defense practices as the environment changes.', duration: 'Ongoing' },
];

export default function SecurityProcess() {
  return (
    <section className="relative z-10 border-t bg-[var(--nw-pure-white)] py-16 sm:py-20" style={{ borderColor: 'var(--nw-mist-gray)' }}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="How an engagement works"
          description="A practical four-phase approach that builds protection in a deliberate, understandable way."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="relative rounded-lg border p-6" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <div className="flex items-center justify-between gap-4">
                  <span className="nw-display flex h-9 w-9 items-center justify-center rounded-full text-sm text-[var(--nw-deep-current)]" style={{ background: 'var(--nw-signal-cyan)' }} aria-hidden="true">{index + 1}</span>
                  <Icon size={19} className="text-[var(--nw-tide-blue)]" aria-hidden="true" />
                </div>
                <p className="nw-meta mt-6 text-xs text-[var(--nw-slate)]">{step.duration}</p>
                <h3 className="mt-2 font-bold text-[var(--nw-current-navy)]">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--nw-slate)]">{step.description}</p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
