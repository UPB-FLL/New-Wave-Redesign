import { ArrowRight, Code2, GraduationCap, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CurrentField } from '../brand/CurrentField';
import LiquidGlassCard from './LiquidGlassCard';

export default function CodeNestHero() {
  return (
    <section id="top" className="relative overflow-hidden px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32" style={{ background: 'var(--nw-deep-current)' }}>
      <CurrentField density="standard" tone="dark" className="pointer-events-none absolute inset-0 h-full w-full opacity-65" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <p className="nw-kicker text-[var(--nw-signal-cyan)]">CodeNest by New Wave IT</p>
          <h1 className="nw-display mt-3 max-w-3xl text-4xl leading-[1.05] text-[var(--nw-cloud-white)] sm:text-5xl lg:text-6xl">Launch your <span className="text-[var(--nw-signal-cyan)]">coding career.</span></h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[var(--nw-mist-gray)]">Build in-demand coding skills through project-based courses, real-world mentorship, and a career-ready curriculum shaped by working engineers.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/contact" className="btn-primary">Explore CodeNest <ArrowRight size={17} aria-hidden="true" /></Link><a href="#program" className="btn-secondary">View the program</a></div>
        </div>
        <div id="program" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <LiquidGlassCard />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            <article className="rounded-lg border p-5" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-tide-blue)' }}><Code2 size={20} className="text-[var(--nw-signal-cyan)]" aria-hidden="true" /><h2 className="mt-4 font-bold text-[var(--nw-cloud-white)]">Project-Based</h2><p className="mt-2 text-sm leading-relaxed text-[var(--nw-mist-gray)]">Build a portfolio through practical work.</p></article>
            <article className="rounded-lg border p-5" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-tide-blue)' }}><Users size={20} className="text-[var(--nw-signal-cyan)]" aria-hidden="true" /><h2 className="mt-4 font-bold text-[var(--nw-cloud-white)]">Mentorship</h2><p className="mt-2 text-sm leading-relaxed text-[var(--nw-mist-gray)]">Learn with guidance from experienced practitioners.</p></article>
            <article className="rounded-lg border p-5 sm:col-span-2" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-tide-blue)' }}><GraduationCap size={20} className="text-[var(--nw-signal-cyan)]" aria-hidden="true" /><h2 className="mt-4 font-bold text-[var(--nw-cloud-white)]">Career-Ready Curriculum</h2><p className="mt-2 text-sm leading-relaxed text-[var(--nw-mist-gray)]">A focused progression for learners preparing to contribute to real-world products.</p></article>
          </div>
        </div>
      </div>
    </section>
  );
}
