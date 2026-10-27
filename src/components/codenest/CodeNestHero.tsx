import { ArrowRight, Briefcase, Code2, GraduationCap, Users, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { IT_PAGE_META } from '../../lib/routeMeta';
import { PageHeader } from '../brand/PageHeader';
import { SectionHeading } from '../brand/SectionHeading';

const program: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Briefcase, title: 'Taught by industry professionals', description: 'Learn directly from engineers who build and support real products at scale.' },
  { icon: Code2, title: 'Project-based', description: 'Build a portfolio through practical work.' },
  { icon: Users, title: 'Mentorship', description: 'Learn with guidance from experienced practitioners.' },
  { icon: GraduationCap, title: 'Career-ready curriculum', description: 'A focused progression for learners preparing to contribute to real-world products.' },
];

export default function CodeNestHero() {
  return (
    <>
      <PageHeader
        breadcrumbs={IT_PAGE_META['/codenest'].breadcrumbs}
        title="Launch your coding career."
        description="Build in-demand coding skills through project-based courses, real-world mentorship, and a career-ready curriculum shaped by working engineers."
        actions={
          <>
            <Link to="/contact" className="btn-primary">Explore CodeNest <ArrowRight size={17} aria-hidden="true" /></Link>
            <a href="#program" className="btn-ghost-dark">View the program</a>
          </>
        }
      />
      <section id="program" className="relative z-10 scroll-mt-20 border-t bg-[var(--nw-pure-white)] py-16 sm:py-20" style={{ borderColor: 'var(--nw-mist-gray)' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="The program" description="CodeNest by New Wave IT: career-focused learning, shaped by working engineers." />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {program.map(({ icon: Icon, title, description }) => (
              <article key={title} className="rounded-lg border p-6" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
                <h3 className="mt-5 font-bold text-[var(--nw-current-navy)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
