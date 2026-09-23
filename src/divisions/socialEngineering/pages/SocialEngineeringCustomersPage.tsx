import { Link } from 'react-router-dom';
import { DivisionLayout } from '../components/DivisionLayout';
import { Band, CtaBand, DivisionHero } from '../components/sections';
import { customersContent, divisionCustomers } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { customersPageSeo } from '../seo';
import type { DivisionCustomer } from '../types';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = customersPageSeo();

const isExternal = (href: string) => /^https?:\/\//.test(href);

// A 44px target on touch widths (below lg); the negative margins keep the
// text exactly where a 20px link would sit.
const linkClass =
  'nwse-link inline-flex items-center gap-1.5 text-sm max-lg:min-h-11 max-md:-mb-2.5 md:max-lg:-my-3 [overflow-wrap:anywhere]';

/** The customer's own site, or New Wave IT's home page in the app. The link text is the bare domain. */
function CustomerLink({ customer }: { customer: DivisionCustomer }) {
  if (!isExternal(customer.href)) {
    return (
      <Link to={customer.href} className={linkClass}>
        {customer.linkLabel}
        <NwseIcon name="arrow-right" size={16} className="shrink-0" />
      </Link>
    );
  }
  return (
    <a href={customer.href} target="_blank" rel="noopener" className={linkClass}>
      {customer.linkLabel}
      <span className="sr-only">{customersContent.externalLinkNote}</span>
      <NwseIcon name="arrow-up-right" size={16} className="shrink-0" />
    </a>
  );
}

/**
 * One row per business: what it is, where it is, and a link to its site.
 * Phones stack each row in one grouped panel (the division's row-list
 * pattern); from md the rows share columns (subgrid), with the link under the
 * description; from xl the link gets a column of its own.
 */
function CustomerList() {
  return (
    <ul className="nwse-card overflow-hidden divide-y divide-[color:var(--nw-mist-gray)] md:grid md:grid-cols-[auto_minmax(0,1fr)] md:gap-x-10 xl:grid-cols-[auto_minmax(0,1fr)_auto] xl:gap-x-14">
      {divisionCustomers.map((customer) => (
        <li
          key={customer.name}
          className="flex flex-col p-4 sm:p-6 md:col-span-full md:grid md:grid-cols-subgrid md:gap-y-3 lg:px-8 lg:py-7 xl:items-center"
        >
          {/* Name first in the DOM (heading navigation lands on it); the category shows above it. */}
          <div className="flex flex-col md:col-start-1 md:row-span-2 md:row-start-1 xl:row-span-1">
            <h3 className="nwse-type-title-1 order-2 mt-1 text-[var(--nw-current-navy)]">{customer.name}</h3>
            <p className="nwse-type-label nwse-label order-1">{customer.category}</p>
            <p className="nwse-type-body-small order-3 mt-1.5 flex items-center gap-1.5 text-[var(--nw-slate)]">
              <NwseIcon name="map-pin" size={16} className="shrink-0 text-[var(--nw-tide-blue)]" />
              {customer.location}
            </p>
          </div>
          <p className="nwse-type-body mt-3 max-w-2xl text-[var(--nw-slate)] md:col-start-2 md:row-start-1 md:mt-0">{customer.description}</p>
          <div className="mt-2 md:col-start-2 md:row-start-2 md:mt-0 xl:col-start-3 xl:row-start-1 xl:justify-self-end">
            <CustomerLink customer={customer} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function SocialEngineeringCustomersPage() {
  useDivisionMeta(seo);
  const content = customersContent;

  return (
    <DivisionLayout>
      <DivisionHero breadcrumbs={seo.breadcrumbs} kicker={content.kicker} headline={content.headline} summary={content.summary} />

      <Band labelledBy="nwse-customers">
        <h2 id="nwse-customers" className="sr-only">
          {content.listHeading}
        </h2>
        <CustomerList />
      </Band>

      <CtaBand heading={content.cta.heading} body={content.cta.body} />
    </DivisionLayout>
  );
}
