import { Link } from 'react-router-dom';
import { GroundswellMarketingLayout } from '../components/GroundswellMarketingLayout';
import { GroundswellSectionBand as SectionBand } from '../components/GroundswellSectionBand';
import { accentAt } from '../components/pillarStyle';
import { CheckList, CtaBand, SectionIntro } from '../components/sections';
import { auditContent, auditSample, findGroundswellMetricGroup, groundswellMetricGroups, groundswellMetricsContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { groundswellMetricPageSeo } from '../seo';
import { DIVISION_BASE_PATH, DIVISION_CONTACT_PATH, DIVISION_GROUNDSWELL_PATH, groundswellMetricPath, type GroundswellMetricSlug } from '../site';
import { useDivisionMeta } from '../useDivisionMeta';

/**
 * One group of the metrics GroundSwell gathers: why it matters, every metric
 * with what it measures and where it comes from, what it does not measure,
 * where it appears in the reports, and the brewery's figure where the engine
 * measures one. Linked from the card on the GroundSwell page.
 */
export default function SocialEngineeringGroundswellMetricPage({ slug }: { slug: GroundswellMetricSlug }) {
  const group = findGroundswellMetricGroup(slug);
  if (!group) throw new Error(`No GroundSwell metric group is named ${slug}.`);
  const c = groundswellMetricsContent.page;
  const index = groundswellMetricGroups.indexOf(group);
  const color = accentAt(index);
  useDivisionMeta(groundswellMetricPageSeo(group));

  return (
    <GroundswellMarketingLayout sectionsAt={DIVISION_GROUNDSWELL_PATH}>
      <section className="gs-marketing-hero" aria-labelledby="groundswell-metric-heading">
        <div className="gs-marketing-hero-inner" style={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <div className="gs-marketing-hero-copy">
            <nav aria-label="Breadcrumb" className="gs-marketing-breadcrumb">
              <Link to="/">New Wave IT</Link>
              <span aria-hidden="true">/</span>
              <Link to={DIVISION_BASE_PATH}>Services</Link>
              <span aria-hidden="true">/</span>
              <Link to={DIVISION_GROUNDSWELL_PATH}>{auditContent.navLabel}</Link>
              <span aria-hidden="true">/</span>
              <span aria-current="page">{group.name}</span>
            </nav>
            <p className="gs-marketing-eyebrow">{c.kicker}</p>
            <h1 id="groundswell-metric-heading">{group.headline}</h1>
            <p className="gs-marketing-summary">{group.summary}</p>
            <div className="gs-marketing-actions">
              <Link to={DIVISION_CONTACT_PATH} className="gs-marketing-button">
                Book a discovery call <NwseIcon name="arrow-up-right" size={17} aria-hidden="true" />
              </Link>
              <Link to={`${DIVISION_GROUNDSWELL_PATH}#metrics`} className="gs-marketing-button gs-marketing-button-outline">
                {c.back} <NwseIcon name="arrow-right" size={17} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <SectionBand surface="foam" id="why" labelledBy="gs-metric-why">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
          <div>
            <SectionIntro kicker={c.whyKicker} title={c.whyHeading} id="gs-metric-why" />
            <p className="nwse-type-body mt-4 max-w-3xl text-[var(--nw-slate)] sm:mt-5">{group.why}</p>
          </div>
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className={`nwse-tint ${color.tint} rounded-lg p-4 sm:p-5`} data-role="feeds">
              <p className="nwse-type-label nwse-label">{c.feedsLabel}</p>
              <p className="nwse-type-body-small mt-2 text-[var(--nw-current-navy)]">{group.feeds}</p>
            </div>
            {group.example ? (
              <div className="nwse-card p-4 sm:p-5" data-role="example">
                <p className="nwse-type-label nwse-label">{c.exampleLabel}</p>
                <p className="nwse-type-body-small mt-2 text-[var(--nw-current-navy)]">{group.example}</p>
                <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{auditSample.label}</p>
              </div>
            ) : null}
          </div>
        </div>
      </SectionBand>

      <SectionBand surface="sample" id="metrics" labelledBy="gs-metric-list">
        <SectionIntro kicker={c.metricsKicker} title={c.metricsHeading} id="gs-metric-list" />
        <ol className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 md:grid-cols-2 md:gap-4 lg:mt-10" data-role="metrics">
          {group.metrics.map((metric) => (
            <li key={metric.name} className="nwse-card flex flex-col p-4 sm:p-5 lg:p-6">
              <h3 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{metric.name}</h3>
              <dl className="mt-3 flex flex-col gap-3">
                <div>
                  <dt className="nwse-type-label nwse-label">{c.whatLabel}</dt>
                  <dd className="nwse-type-body-small mt-1 text-[var(--nw-current-navy)]">{metric.what}</dd>
                </div>
                <div>
                  <dt className="nwse-type-label nwse-label">{c.sourceLabel}</dt>
                  <dd className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">{metric.source}</dd>
                </div>
                <div className="border-t pt-3" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                  <dt className="nwse-type-label nwse-label">{c.whyLabel}</dt>
                  <dd className="nwse-type-body-small mt-1 text-[var(--nw-current-navy)]">{metric.why}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </SectionBand>

      <SectionBand surface="navy" id="limits" labelledBy="gs-metric-limits">
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-12">
          <div className="gs-growth-panel p-4 sm:p-5 lg:p-6">
            <h2 id="gs-metric-limits" className="nwse-type-title-1 text-[var(--gs-white)]">
              {c.limitsHeading}
            </h2>
            <CheckList items={group.limits} color={color} tone="dark" />
          </div>
          <div className="gs-growth-panel p-4 sm:p-5 lg:p-6">
            <h2 className="nwse-type-title-1 text-[var(--gs-white)]">{c.reportsHeading}</h2>
            <p className="nwse-type-body-small mt-4 text-[var(--gs-mist)] sm:mt-6">{group.reports}</p>
          </div>
        </div>
      </SectionBand>

      <SectionBand surface="navigation" compact>
        <nav aria-label={c.othersLabel} className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="nwse-type-label nwse-label mr-1">{c.othersLabel}</span>
          {groundswellMetricGroups
            .filter((other) => other.slug !== group.slug)
            .map((other) => (
              <Link key={other.slug} to={groundswellMetricPath(other.slug)} className="nwse-chip nwse-type-body-small font-medium">
                {other.name}
              </Link>
            ))}
        </nav>
      </SectionBand>

      <CtaBand heading={c.cta.heading} body={c.cta.body} />
    </GroundswellMarketingLayout>
  );
}
