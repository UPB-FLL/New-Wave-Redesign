import { DivisionLayout } from '../components/DivisionLayout';
import { Band, CheckList, CtaBand, DivisionHero, FaqList, PrimaryCta, SectionIntro, StepList } from '../components/sections';
import { auditConnectors, auditContent, auditReports, auditSample } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { croissancePageSeo } from '../seo';
import { useDivisionMeta } from '../useDivisionMeta';
import { GROUNDSWELL_CONFIG } from '../../../../packages/groundswell/groundswell.config';
import { UPB_ANGLES, UPB_INDUSTRY, UPB_TEMPLATES } from '../../../../packages/groundswell/examples/uncommon-path-brewing';
import { buildAdPlan, type PlanRow } from '../../../../packages/groundswell/src/adplan';

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
 * A real client's audit: its key findings, then its return board, one card per
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
      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-5 border-b pb-5 sm:mt-6 sm:pb-6 lg:grid-cols-4" style={{ borderColor: 'var(--nw-mist-gray)' }}>
        {auditSample.findings.map((finding) => (
          <li key={finding.value + finding.label}>
            <p className="nwse-type-title-1 tabular-nums text-[var(--nw-current-navy)]">{finding.value}</p>
            <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">{finding.label}</p>
          </li>
        ))}
      </ul>
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

// The brewery's ad plan, computed from its use-case inputs and the setup file: no number here is typed by hand.
const upbIndustry = GROUNDSWELL_CONFIG.industries.find((i) => i.id === UPB_INDUSTRY)!;
const upbPlan = buildAdPlan(UPB_ANGLES, upbIndustry, GROUNDSWELL_CONFIG);

const dollars = (x: number) => `${x < 0 ? '−' : ''}$${Math.abs(Math.round(x / 10) * 10).toLocaleString('en-US')}`;
const cents = (x: number) => `$${x.toFixed(2)}`;

function netRange(row: PlanRow) {
  if (row.roi_tier === 'not modeled') return 'Not modeled';
  return `${dollars(row.scenarios.low.year_net)} to ${dollars(row.scenarios.high.year_net)}`;
}

/** The plan as a table from md; stacked cards on phones. Funded and tested rows first, then the skips, each with its reason. */
function AdPlanBoard() {
  const c = auditContent.adPlan;
  const shown = upbPlan.rows.filter((r) => r.recommendation !== 'skip' || r.roi_tier !== 'not modeled');
  const callClass = (r: PlanRow) =>
    r.recommendation === 'fund' ? 'text-[var(--nwse-lure-amber-deep)]' : r.recommendation === 'test' ? 'text-[var(--nw-tide-blue)]' : 'text-[var(--nw-slate)]';
  return (
    <div className="nwse-card mt-6 overflow-hidden sm:mt-8 lg:mt-10">
      <table className="w-full text-left max-md:block">
        <thead className="max-md:hidden">
          <tr className="border-b" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            {[c.columns.angle, c.columns.platform, c.columns.cpc, c.columns.clicks, c.columns.spend, c.columns.net, c.columns.call].map((h) => (
              <th key={h} scope="col" className="nwse-type-label nwse-label px-4 py-3 font-normal lg:px-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {shown.map((r) => (
            <tr key={`${r.angle_id}-${r.platform}`} className="border-b align-top last:border-b-0 max-md:block max-md:px-4 max-md:py-4" style={{ borderColor: 'var(--nw-mist-gray)' }}>
              <th scope="row" className="nwse-type-body-small px-4 py-3 font-semibold text-[var(--nw-current-navy)] max-md:block max-md:p-0 lg:px-6">
                {r.angle}
                <span className="block font-normal text-[var(--nw-slate)] md:hidden">{r.platform_label}</span>
              </th>
              <td className="nwse-type-body-small px-4 py-3 text-[var(--nw-slate)] max-md:hidden lg:px-6">{r.platform_label}</td>
              <td className="nwse-type-body-small px-4 py-3 tabular-nums text-[var(--nw-current-navy)] max-md:inline-block max-md:p-0 max-md:pr-4 lg:px-6">
                <span className="md:hidden">{c.columns.cpc}: </span>
                {cents(r.scenarios.medium.cpc)}
              </td>
              <td className="nwse-type-body-small px-4 py-3 tabular-nums text-[var(--nw-current-navy)] max-md:inline-block max-md:p-0 max-md:pr-4 lg:px-6">
                <span className="md:hidden">{c.columns.clicks}: </span>
                {Math.round(r.scenarios.medium.clicks).toLocaleString('en-US')}
              </td>
              <td className="nwse-type-body-small px-4 py-3 tabular-nums text-[var(--nw-current-navy)] max-md:inline-block max-md:p-0 lg:px-6">
                <span className="md:hidden">{c.columns.spend}: </span>
                {dollars(r.scenarios.medium.spend)}
              </td>
              <td className="nwse-type-body-small px-4 py-3 tabular-nums text-[var(--nw-current-navy)] max-md:block max-md:p-0 max-md:pt-1 lg:px-6">
                <span className="md:hidden">{c.columns.net}: </span>
                {netRange(r)}
              </td>
              <td className="nwse-type-body-small px-4 py-3 max-md:block max-md:p-0 max-md:pt-1 lg:px-6">
                <span className={`font-semibold ${callClass(r)}`}>{c.calls[r.recommendation]}</span>
                <span className="mt-0.5 block text-[var(--nw-slate)]">{r.reason}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(() => {
        // Each platform's conditions once, not on every row.
        const rules = [...new Set(upbPlan.rows.filter((r) => r.recommendation !== 'skip').flatMap((r) => r.conditions))];
        return rules.length ? (
          <p className="nwse-type-body-small border-t px-4 py-3 text-[var(--nw-slate)] lg:px-6" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <span className="font-semibold text-[var(--nw-current-navy)]">{auditContent.adPlan.conditionsHeading}: </span>
            {rules.join(' ')}
          </p>
        ) : null;
      })()}
      {upbPlan.unmodeled.length ? (
        <p className="nwse-type-body-small border-t px-4 py-3 text-[var(--nw-slate)] lg:px-6" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          <span className="font-semibold text-[var(--nw-current-navy)]">{c.unmodeledHeading}: </span>
          {[...new Set(upbPlan.unmodeled.map((u) => u.reason))].join(' ')}
        </p>
      ) : null}
    </div>
  );
}

const PREVIEWS = [
  { platform: 'google_search', angle: 'events' },
  { platform: 'meta', angle: 'events' },
  { platform: 'reddit', angle: 'events' },
  { platform: 'tiktok', angle: 'pizza' },
] as const;

/** A few of the brewery's templates, field by field, with where each one stands. */
function TemplatePreviews() {
  const c = auditContent.adPlan;
  return (
    <div className="mt-10 lg:mt-14">
      <h3 className="nwse-type-title-1 text-[var(--nw-current-navy)]">{c.templatesHeading}</h3>
      <p className="nwse-type-body-small mt-2 max-w-3xl text-[var(--nw-slate)]">{c.templatesIntro}</p>
      <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {PREVIEWS.map(({ platform, angle }) => {
          const t = UPB_TEMPLATES.find((x) => x.platform === platform && x.angle_id === angle)!;
          const p = GROUNDSWELL_CONFIG.platforms[platform];
          const row = upbPlan.rows.find((r) => r.platform === platform && r.angle_id === angle);
          const status = row ? `${c.calls[row.recommendation]}: ${row.reason}` : upbPlan.unmodeled.find((u) => u.platform === platform)?.reason ?? '';
          return (
            <li key={`${platform}-${angle}`} className="nwse-card flex flex-col p-4 sm:p-5">
              <p className="nwse-type-label nwse-label">
                {p.label} · {p.template.format}
              </p>
              <dl className="mt-3 flex flex-col gap-2">
                {Object.entries(t.fields).map(([field, value]) => (
                  <div key={field}>
                    <dt className="nwse-type-body-small text-[var(--nw-slate)]">{field.replace(/_/g, ' ').replace(/(\d)$/, ' $1')}</dt>
                    <dd className="nwse-type-body-small text-[var(--nw-current-navy)]">{Array.isArray(value) ? value.join(' · ') : value}</dd>
                  </div>
                ))}
              </dl>
              <p className="nwse-type-body-small mt-3 border-t pt-3 text-[var(--nw-slate)]" style={{ borderColor: 'var(--nw-mist-gray)' }}>
                {t.targeting}
              </p>
              <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{status}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function SocialEngineeringCroissancePage() {
  useDivisionMeta(seo);
  const content = auditContent;

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        // The hub's scene (guesswork straightening into a rising trend): the
        // audit's story too. From 375px, like the service pages: the summary
        // runs long on the smallest phones.
        scene="hub"
        sceneOnPhones="wide"
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

      <Band labelledBy="nwse-audit-adplan">
        <SectionIntro kicker={content.adPlan.kicker} title={content.adPlan.heading} description={content.adPlan.intro} id="nwse-audit-adplan" />
        <AdPlanBoard />
        <p className="nwse-type-body-small mt-3 max-w-4xl text-[var(--nw-slate)]">{content.adPlan.footnote}</p>
        <TemplatePreviews />
      </Band>

      <Band tone="white" labelledBy="nwse-audit-growth">
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

      <Band labelledBy="nwse-audit-faq">
        <SectionIntro kicker="Questions" title="Common questions" id="nwse-audit-faq" />
        <FaqList faqs={content.faqs} />
      </Band>

      <CtaBand heading={content.cta.heading} body={content.cta.body} />
    </DivisionLayout>
  );
}
