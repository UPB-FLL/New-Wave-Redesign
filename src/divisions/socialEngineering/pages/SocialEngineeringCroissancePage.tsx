import { DivisionLayout } from '../components/DivisionLayout';
import { Band, CheckList, CtaBand, DivisionHero, FaqList, PrimaryCta, SectionIntro, StepList } from '../components/sections';
import { auditConnectors, auditContent, auditReports, auditSample } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { croissancePageSeo } from '../seo';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = croissancePageSeo();

/** The Currents: one card per kind of public data, with where it comes from and what it brings back. */
function ConnectorGrid() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 md:grid-cols-2 md:gap-4 lg:mt-10 lg:grid-cols-3">
      {auditConnectors.map((connector) => (
        <li key={connector.name} className="nwse-card flex flex-col p-4 sm:p-5 lg:p-6">
          <div className="flex items-center gap-3">
            <span className="nwse-icon h-10 w-10 shrink-0">
              <NwseIcon name={connector.icon} size={20} />
            </span>
            <h3 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{connector.name}</h3>
          </div>
          <p className="nwse-type-label nwse-label mt-4">{connector.source}</p>
          <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{connector.gathers}</p>
        </li>
      ))}
    </ul>
  );
}

function ReportGrid() {
  return (
    <ol className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 md:grid-cols-3 md:gap-4 lg:mt-10">
      {auditReports.map((report) => (
        <li key={report.name} className="nwse-card flex flex-col p-4 sm:p-5 lg:p-6">
          <span className="block h-1 w-10 rounded-full" style={{ background: 'var(--nwse-lure-amber)' }} aria-hidden="true" />
          <p className="nwse-type-label nwse-label mt-4">{report.audience}</p>
          <h3 className="nwse-type-title-1 mt-1 text-[var(--nw-current-navy)]">{report.name}</h3>
          <p className="nwse-type-body-small mt-1 font-semibold text-[var(--nwse-lure-amber-deep)]">{report.format}</p>
          <p className="nwse-type-body-small mt-3 text-[var(--nw-slate)]">{report.detail}</p>
        </li>
      ))}
    </ol>
  );
}

/**
 * The return board from the engine's made-up sample business: one card per
 * scenario (they stack on phones), the base case outlined in amber.
 */
function SampleBoard() {
  return (
    <figure className="nwse-card mt-6 p-4 sm:mt-8 sm:p-6 lg:mt-10 lg:p-8" aria-labelledby="nwse-sample-caption">
      <div className="flex flex-col gap-2 border-b pb-4 sm:pb-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8" style={{ borderColor: 'var(--nw-mist-gray)' }}>
        <div className="max-w-2xl">
          <p className="nwse-type-label nwse-label">{auditSample.label}</p>
          <h3 className="nwse-type-title-1 mt-1 text-[var(--nw-current-navy)]">{auditSample.business}</h3>
          <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">{auditSample.lever}</p>
        </div>
        <div className="lg:text-right">
          <p className="nwse-type-display-2 text-[var(--nw-current-navy)]">{auditSample.demand.value}</p>
          <p className="nwse-type-body-small text-[var(--nw-slate)]">{auditSample.demand.label}</p>
        </div>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:mt-6 md:grid-cols-3 md:gap-4">
        {auditSample.scenarios.map((scenario) => {
          const highlighted = 'highlighted' in scenario && scenario.highlighted;
          return (
            <li
              key={scenario.name}
              className="rounded-lg border p-4 sm:p-5"
              style={{
                borderColor: highlighted ? 'var(--nwse-lure-amber-deep)' : 'var(--nw-mist-gray)',
                borderWidth: highlighted ? 2 : 1,
                background: 'var(--nw-pure-white)',
              }}
            >
              <h4 className={`nwse-type-label nwse-label${highlighted ? ' text-[var(--nwse-lure-amber-deep)]' : ''}`}>{scenario.name}</h4>
              <dl className="mt-3 flex flex-col gap-2">
                {scenario.figures.map((figure) => (
                  <div key={figure.label} className="flex items-baseline justify-between gap-4">
                    <dt className="nwse-type-body-small text-[var(--nw-slate)]">{figure.label}</dt>
                    <dd className="font-semibold tabular-nums text-[var(--nw-current-navy)]">{figure.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>
      <figcaption id="nwse-sample-caption" className="nwse-type-body-small mt-4 flex flex-col gap-2 text-[var(--nw-slate)] sm:mt-6">
        <span>{auditSample.businessNote}</span>
        <span>{auditSample.stopLoss}</span>
        <span>{auditSample.footnote}</span>
      </figcaption>
    </figure>
  );
}

export default function SocialEngineeringCroissancePage() {
  useDivisionMeta(seo);
  const content = auditContent;

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        kicker={content.kicker}
        headline={content.headline}
        summary={content.summary}
        actions={<PrimaryCta />}
      />

      <Band labelledBy="nwse-audit-engine">
        <SectionIntro kicker={content.engine.kicker} title={content.engine.heading} description={content.engine.intro} id="nwse-audit-engine" />
        <ConnectorGrid />
        <CheckList items={content.rules} />
      </Band>

      <Band tone="white" labelledBy="nwse-audit-process">
        <SectionIntro kicker={content.process.kicker} title={content.process.heading} description={content.process.intro} id="nwse-audit-process" />
        <StepList steps={content.process.steps} />
      </Band>

      <Band labelledBy="nwse-audit-reports">
        <SectionIntro kicker={content.reports.kicker} title={content.reports.heading} description={content.reports.intro} id="nwse-audit-reports" />
        <ReportGrid />
      </Band>

      <Band tone="white" labelledBy="nwse-audit-sample">
        <SectionIntro kicker={content.sample.kicker} title={content.sample.heading} description={content.sample.intro} id="nwse-audit-sample" />
        <SampleBoard />
      </Band>

      <Band labelledBy="nwse-audit-growth">
        <SectionIntro kicker={content.growth.kicker} title={content.growth.heading} description={content.growth.intro} id="nwse-audit-growth" />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 md:grid-cols-2 md:gap-4 lg:mt-10">
          {content.growth.groups.map((group) => (
            <div key={group.title} className="nwse-card p-4 sm:p-5 lg:p-6">
              <h3 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{group.title}</h3>
              <CheckList items={group.items} />
            </div>
          ))}
        </div>
      </Band>

      <Band tone="white" labelledBy="nwse-audit-faq">
        <SectionIntro kicker="Questions" title="Common questions" id="nwse-audit-faq" />
        <FaqList faqs={content.faqs} />
      </Band>

      <CtaBand heading={content.cta.heading} body={content.cta.body} />
    </DivisionLayout>
  );
}
