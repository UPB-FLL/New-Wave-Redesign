import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CurrentField } from '../brand/CurrentField';

const credentials = ['SOC 2 Type II', 'ISO 27001', 'HIPAA', 'PCI-DSS'];

export default function CybersecurityHero() {
  const navigate = useNavigate();

  const scrollToServices = () => {
    document.querySelector('#services')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32" style={{ background: 'var(--nw-deep-current)' }}>
      <CurrentField density="standard" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-65" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
        <div>
          <p className="nw-kicker text-[var(--nw-signal-cyan)]">Cybersecurity</p>
          <h1 className="nw-display mt-3 max-w-4xl text-4xl leading-[1.05] text-[var(--nw-cloud-white)] sm:text-5xl lg:text-6xl">
            Enterprise security <span className="text-[var(--nw-signal-cyan)]">without the enterprise headache.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--nw-mist-gray)]">
            Stop threats before they reach your business. New Wave IT combines around-the-clock security operations, threat detection, and experienced analysts in a program built for practical business needs.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => navigate('/contact')} className="btn-primary">
              Get a Security Assessment
              <ArrowRight size={17} aria-hidden="true" />
            </button>
            <button type="button" onClick={scrollToServices} className="btn-secondary">
              Explore Solutions
            </button>
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 border-t pt-6" style={{ borderColor: 'var(--nw-tide-blue)' }}>
            {credentials.map((credential) => (
              <li key={credential} className="flex items-center gap-2 text-sm text-[var(--nw-mist-gray)]">
                <ShieldCheck size={17} className="text-[var(--nw-continuity-green)]" aria-hidden="true" />
                {credential}
              </li>
            ))}
          </ul>
        </div>

        <aside className="border p-6 sm:p-8" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-tide-blue)', borderRadius: 'var(--nw-radius-panel)' }}>
          <p className="nw-kicker text-[var(--nw-signal-cyan)]">Security Program</p>
          <h2 className="nw-display mt-3 text-2xl text-[var(--nw-cloud-white)]">A clear view of your risk.</h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--nw-mist-gray)]">
            Start with a practical assessment, then move forward with a measured response plan and continuous protection.
          </p>
          <dl className="mt-7 divide-y" style={{ borderColor: 'var(--nw-tide-blue)' }}>
            {[
              ['Assess', 'Understand exposure and priorities'],
              ['Prioritize', 'Plan remediation around business impact'],
              ['Protect', 'Monitor and improve over time'],
            ].map(([term, definition]) => (
              <div key={term} className="flex gap-3 py-4 first:pt-0">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--nw-signal-cyan)] text-[var(--nw-deep-current)]">
                  <Lock size={15} aria-hidden="true" />
                </span>
                <div>
                  <dt className="font-semibold text-[var(--nw-cloud-white)]">{term}</dt>
                  <dd className="mt-1 text-sm text-[var(--nw-mist-gray)]">{definition}</dd>
                </div>
              </div>
            ))}
          </dl>
        </aside>
      </div>
    </section>
  );
}
