import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Section } from './Section';
import { SectionHeading } from './SectionHeading';

export type RelatedLink = {
  label: string;
  /** Site-relative path of the page, e.g. '/pricing'. */
  href: string;
  /** One sentence on what the page covers. */
  description?: string;
};

type RelatedLinksProps = {
  title?: string;
  links: readonly RelatedLink[];
  tone?: 'white' | 'base';
};

/** Links from one page to the services and areas beside it. The link text is the label alone. */
export function RelatedLinks({ title, links, tone = 'white' }: RelatedLinksProps) {
  if (!links.length) return null;
  return (
    <Section tone={tone}>
      <SectionHeading title={title || 'Related services and areas'} />
      <ul className="mt-8 grid max-w-5xl gap-x-10 md:grid-cols-2">
        {links.map((link) => (
          <li key={link.href} className="border-t py-4" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <Link to={link.href} className="inline-flex items-center gap-1.5 text-base font-semibold text-[var(--nw-tide-blue)] transition-colors hover:text-[var(--nw-current-navy)]">
              {link.label}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            {link.description ? <span className="mt-1 block text-sm leading-relaxed text-[var(--nw-slate)]">{link.description}</span> : null}
          </li>
        ))}
      </ul>
    </Section>
  );
}
