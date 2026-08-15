import { FileText, LineChart, Rocket, Search, type LucideIcon } from 'lucide-react';
import { SectionHeading } from '../brand/SectionHeading';

const steps: { number: string; icon: LucideIcon; title: string; description: string; duration: string }[] = [
  { number: '01', icon: Search, title: 'Security Assessment', description: 'A comprehensive review of the environment to identify gaps, vulnerabilities, and compliance risks.', duration: 'Week 1' },
  { number: '02', icon: FileText, title: 'Custom Roadmap', description: 'A prioritized remediation plan tailored to your risk, regulatory requirements, and budget.', duration: 'Week 1-2' },
  { number: '03', icon: Rocket, title: 'Deploy & Configure', description: 'Certified engineers handle implementation with continuity planning and clear communication.', duration: 'Week 2-4' },
  { number: '04', icon: LineChart, title: 'Monitor & Optimize', description: 'Continuous monitoring, regular reviews, and evolving defense practices as the environment changes.', duration: 'Ongoing' },
];

export default function SecurityProcess() {
  return (
    <section className="bg-[var(--nw-pure-white)] py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          align="center"
          eyebrow="How We Engage"
          title={<>From assessment to <span className="text-[var(--nw-tide-blue)]">active defense.</span></>}
          description="A practical four-phase approach that builds protection in a deliberate, understandable way."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.number} className="relative rounded-lg border p-6" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <div className="flex items-start justify-between gap-4">
                  <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
                  <span className="nw-meta text-sm text-[var(--nw-tide-blue)]">{step.number}</span>
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
