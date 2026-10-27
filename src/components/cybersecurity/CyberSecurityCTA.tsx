import { ArrowRight, CheckCircle2, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useContent } from '../../lib/useContent';
import { CurrentField } from '../brand/CurrentField';

const deliverables = [
  { title: 'Vulnerability Report', description: 'A prioritized view of security gaps' },
  { title: 'Compliance Gap Analysis', description: 'Mapped to applicable regulations' },
  { title: '90-Day Roadmap', description: 'A practical remediation plan' },
  { title: 'Executive Summary', description: 'A clear, board-ready overview' },
];

export default function CyberSecurityCTA() {
  const footer = useContent('footer');
  const phone = footer.phone || '(561) 564-1846';

  return (
    <section id="cta" className="relative overflow-hidden py-16 sm:py-20" style={{ background: 'var(--nw-deep-current)' }}>
      <CurrentField density="subtle" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-60" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center lg:gap-16 lg:px-8">
        <div>
          <h2 className="nw-display text-3xl leading-[1.15] text-[var(--nw-cloud-white)] sm:text-[2.25rem]">Request a security assessment</h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--nw-mist-gray)] sm:text-lg">Get a comprehensive security posture assessment from certified analysts. We will identify vulnerabilities, prioritize remediation, and outline a useful path forward.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/contact" className="btn-primary">Schedule an assessment<ArrowRight size={17} aria-hidden="true" /></Link>
            <a href={`tel:${phone.replace(/\D/g, '')}`} className="btn-ghost-dark"><Phone size={16} aria-hidden="true" />Talk to an engineer</a>
          </div>
          <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--nw-mist-gray)]">
            {['No commitment required', 'Executive-ready report'].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[var(--nw-continuity-green)]" aria-hidden="true" />{item}</li>)}
          </ul>
        </div>
        <aside className="rounded-lg border p-6 sm:p-7" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-tide-blue)' }}>
          <h3 className="text-lg font-bold text-[var(--nw-cloud-white)]">What you receive</h3>
          <ul className="mt-5 space-y-5">
            {deliverables.map((item) => (
              <li key={item.title} className="flex gap-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-[var(--nw-continuity-green)]" aria-hidden="true" />
                <div><p className="font-semibold text-[var(--nw-cloud-white)]">{item.title}</p><p className="mt-1 text-sm text-[var(--nw-mist-gray)]">{item.description}</p></div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
