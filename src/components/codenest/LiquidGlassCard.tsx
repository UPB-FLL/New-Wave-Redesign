import { Briefcase, Code2 } from 'lucide-react';

export default function LiquidGlassCard() {
  return (
    <article className="rounded-lg border p-6 sm:p-7" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}>
      <div className="flex items-start justify-between gap-6"><span className="nw-icon-signal h-11 w-11"><Code2 size={21} aria-hidden="true" /></span><span className="nw-meta text-xs text-[var(--nw-tide-blue)]">CODE NEST</span></div>
      <h2 className="nw-display mt-8 text-2xl text-[var(--nw-current-navy)]">Taught by industry professionals.</h2>
      <p className="mt-3 text-sm leading-relaxed text-[var(--nw-slate)]">Learn directly from engineers who build and support real products at scale.</p>
      <div className="mt-6 flex items-center gap-2 border-t pt-5 text-sm font-semibold text-[var(--nw-current-navy)]" style={{ borderColor: 'var(--nw-mist-gray)' }}><Briefcase size={17} className="text-[var(--nw-tide-blue)]" aria-hidden="true" />Career-focused learning</div>
    </article>
  );
}
