import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Crumb } from '../../lib/pageMeta';
import { SERVICE_GUIDE_SUMMARIES } from '../../lib/serviceGuides';
import type { FaqItem } from '../../lib/structuredData';
import Footer from '../Footer';
import Navbar from '../Navbar';
import { CheckList } from './CheckList';
import { CtaBand } from './CtaBand';
import { FaqSection } from './FaqSection';
import { PageHeader } from './PageHeader';
import { RelatedLinks, type RelatedLink } from './RelatedLinks';
import { Section } from './Section';
import { SectionHeading } from './SectionHeading';

export type { FaqItem, RelatedLink };

export type ServicePageCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  items?: string[];
};

export type ServicePageSection = {
  title: string;
  description?: string;
  /** Paragraphs under the heading, before the cards and items. */
  body?: string[];
  cards?: ServicePageCard[];
  items?: string[];
  /** The items are steps taken in order, so they are numbered. */
  ordered?: boolean;
  callout?: string;
};

export type ServiceCategoryPageData = {
  icon: LucideIcon;
  name: string;
  description: string;
  details: string;
  highlights: string[];
  /** The page's guide (/l/…), or another page to read next. A guide that does not exist is never linked. */
  seoLink: string;
  /** Replaces the "Overview" title, often with the question the overview answers. */
  overviewTitle?: string;
  /** More paragraphs in the overview, after `details`. */
  overviewBody?: string[];
  heroTitle?: string;
  heroDescription?: string;
  assessmentLabel?: string;
  guideLabel?: string;
  featureTitle?: string;
  featureDescription?: string;
  featureCards?: ServicePageCard[];
  sections?: ServicePageSection[];
  /** Questions and answers, shown in full after the sections. Hand the same list to the page's FAQPage node. */
  faqs?: FaqItem[];
  faqTitle?: string;
  /** Other pages to read next, after the questions: the links between services and areas. */
  relatedLinks?: RelatedLink[];
  relatedTitle?: string;
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLabel?: string;
};

function readNextLink(seoLink: string): boolean {
  if (!seoLink.startsWith('/l/')) return true;
  return Object.prototype.hasOwnProperty.call(SERVICE_GUIDE_SUMMARIES, seoLink.slice(3));
}

function DetailCard({ card }: { card: ServicePageCard }) {
  const Icon = card.icon;
  return (
    <article className="rounded-lg border p-6" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}>
      <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
      <h3 className="mt-5 text-lg font-bold text-[var(--nw-current-navy)]">{card.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{card.description}</p>
      {card.items?.length ? <CheckList items={card.items} dense className="mt-5 border-t pt-4" /> : null}
    </article>
  );
}

function CardGrid({ cards }: { cards: ServicePageCard[] }) {
  return <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{cards.map((card) => <DetailCard key={card.title} card={card} />)}</div>;
}

export function ServiceCategoryPage({ data, breadcrumbs }: { data: ServiceCategoryPageData; breadcrumbs?: readonly Crumb[] }) {
  const Icon = data.icon;
  const title = data.heroTitle || data.name;
  const description = data.heroDescription || data.description;
  const actionLabel = data.assessmentLabel || 'Request an assessment';
  // Bands alternate from the overview (0) down, whichever of them a page has.
  const bandTone = (position: number) => (position % 2 ? 'base' : 'white');
  const firstSection = data.featureCards?.length ? 2 : 1;
  const faqBand = firstSection + (data.sections?.length ?? 0);
  const relatedBand = faqBand + (data.faqs?.length ? 1 : 0);

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        description={description}
        actions={
          <>
            <Link to="/contact" className="btn-primary">
              {actionLabel}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            {readNextLink(data.seoLink) ? (
              <Link to={data.seoLink} className="btn-ghost-dark">{data.guideLabel || 'Read the guide'}</Link>
            ) : (
              <Link to="/pricing" className="btn-ghost-dark">See pricing</Link>
            )}
          </>
        }
      />

      <main>
        <Section tone="white">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <SectionHeading title={data.overviewTitle || 'Overview'} />
              <p className="mt-5 text-base leading-relaxed text-[var(--nw-slate)] sm:text-lg">{data.details}</p>
              {data.overviewBody?.map((paragraph) => (
                <p key={paragraph} className="mt-4 text-base leading-relaxed text-[var(--nw-slate)] sm:text-lg">{paragraph}</p>
              ))}
            </div>
            <aside className="rounded-lg border p-6" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
              <div className="flex items-center gap-3">
                <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
                <h3 className="text-lg font-bold text-[var(--nw-current-navy)]">Service highlights</h3>
              </div>
              <CheckList items={data.highlights} dense className="mt-5" />
              {/* The local pages' breadcrumb skips Services, so this is their way back to the full list. */}
              <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                <Link to="/services" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--nw-tide-blue)] transition-colors hover:text-[var(--nw-current-navy)]">
                  See all IT services
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </aside>
          </div>
        </Section>

        {data.featureCards?.length ? (
          <Section tone="base">
            <SectionHeading title={data.featureTitle || "What's included"} description={data.featureDescription} />
            <CardGrid cards={data.featureCards} />
          </Section>
        ) : null}

        {data.sections?.map((section, index) => (
          <Section key={section.title} tone={bandTone(firstSection + index)}>
            <SectionHeading title={section.title} description={section.description} />
            {section.body?.length ? (
              <div className="mt-6 max-w-3xl space-y-4 text-base leading-relaxed text-[var(--nw-slate)]">
                {section.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            ) : null}
            {section.cards?.length ? <CardGrid cards={section.cards} /> : null}
            {section.items?.length ? (
              <CheckList items={section.items} ordered={section.ordered} columns={section.ordered ? 1 : 2} className="mt-8 max-w-4xl" />
            ) : null}
            {section.callout ? (
              <aside className="mt-10 max-w-4xl rounded-lg border-l-4 p-6 text-base leading-relaxed text-[var(--nw-mist-gray)]" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-signal-cyan)' }}>
                {section.callout}
              </aside>
            ) : null}
          </Section>
        ))}

        {data.faqs?.length ? <FaqSection title={data.faqTitle} items={data.faqs} tone={bandTone(faqBand)} /> : null}
        {data.relatedLinks?.length ? <RelatedLinks title={data.relatedTitle} links={data.relatedLinks} tone={bandTone(relatedBand)} /> : null}

        <CtaBand
          title={data.ctaTitle || `Ready to plan your ${data.name.toLowerCase()}?`}
          description={data.ctaDescription || `Talk with our team about a practical ${data.name.toLowerCase()} plan that supports your next business objective.`}
          actionLabel={data.ctaLabel}
        />
      </main>
      <Footer />
    </div>
  );
}
