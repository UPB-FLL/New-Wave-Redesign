import { ArrowRight } from 'lucide-react';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Section } from './brand/Section';
import { SectionHeading } from './brand/SectionHeading';

/** The local landing pages and the service-area hub, in the order the band lists them. */
export const AREA_LINKS = [
  { label: 'IT support in Fort Lauderdale', href: '/it-support-fort-lauderdale' },
  { label: 'Managed IT services in Fort Lauderdale', href: '/managed-it-services-fort-lauderdale' },
  { label: 'Managed IT services in Miami', href: '/managed-it-services-miami' },
  { label: 'IT support in Boca Raton', href: '/it-support-boca-raton' },
  { label: 'Managed IT services in West Palm Beach', href: '/managed-it-services-west-palm-beach' },
  { label: 'South Florida service areas', href: '/managed-it-services-south-florida' },
] as const;

/** The closing line's links. The site chrome does not link the blog, so this is its way in from the home page. */
const MORE_LINKS = [
  { label: 'all IT services', href: '/services' },
  { label: 'pricing', href: '/pricing' },
  { label: 'the New Wave IT blog', href: '/blog' },
] as const;

const linkClass = 'font-semibold text-[var(--nw-tide-blue)] transition-colors hover:text-[var(--nw-current-navy)]';

type AreasWeServeProps = {
  tone?: 'white' | 'base';
  /** The page the band sits on: the closing line leaves out a link to it. */
  currentPath?: string;
};

/**
 * The counties New Wave IT serves, with a link to each local page. Code only:
 * the copy states the owner-confirmed service area (docs/geo/fact-sheet.md),
 * so it is not a CMS field. The list is laid out like RelatedLinks.
 */
export default function AreasWeServe({ tone = 'white', currentPath }: AreasWeServeProps) {
  const more = MORE_LINKS.filter((link) => link.href !== currentPath);
  return (
    <Section id="areas-we-serve" tone={tone}>
      <SectionHeading
        title="Areas we serve"
        description="New Wave IT works with businesses across Broward, Miami-Dade and Palm Beach counties from its office at 710 NW 5th Ave in Fort Lauderdale."
      />
      <ul className="mt-8 grid max-w-5xl gap-x-10 md:grid-cols-2">
        {AREA_LINKS.map((link) => (
          <li key={link.href} className="border-t py-4" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <Link to={link.href} className={`inline-flex items-center gap-1.5 text-base ${linkClass}`}>
              {link.label}
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-base leading-relaxed text-[var(--nw-slate)]">
        Also see{' '}
        {more.map((link, index) => (
          <Fragment key={link.href}>
            {index === 0 ? '' : index === more.length - 1 ? ' and ' : ', '}
            <Link to={link.href} className={linkClass}>{link.label}</Link>
          </Fragment>
        ))}
        .
      </p>
    </Section>
  );
}
