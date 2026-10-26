import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { GroundswellMarketingLayout } from '../components/GroundswellMarketingLayout';
import { GroundswellSectionBand as SectionBand } from '../components/GroundswellSectionBand';
import { GroundswellHero } from '../components/GroundswellHero';
import { GroundswellProcess } from '../components/GroundswellProcess';
import { accentAt } from '../components/pillarStyle';
import { CheckList, CtaBand, CtaStrip, FaqList, PrimaryCta, SectionIntro } from '../components/sections';
import { Tabs, type TabItem } from '../components/Tabs';
import { auditConnectors, auditContent, auditReports, auditSample, groundswellMetricGroups, groundswellMetricsContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { groundswellPageSeo } from '../seo';
import { groundswellMetricPath } from '../site';
import { useDivisionMeta } from '../useDivisionMeta';
import { GROUNDSWELL_CONFIG } from '../../../../packages/groundswell/groundswell.config';
import {
  UPB_ANGLES,
  UPB_BASELINE,
  UPB_INDUSTRY,
  UPB_TEMPLATES,
  upbChanges,
} from '../../../../packages/groundswell/examples/uncommon-path-brewing';
import { buildAdPlan, type PlanRow } from '../../../../packages/groundswell/src/adplan';
import { compareWithToday, rankChanges, type RankedChange } from '../../../../packages/groundswell/src/changes';

const seo = groundswellPageSeo();

/** The row of in-page links under the hero: one pill per section, so a reader can go straight to the part they came for. */
function JumpNav() {
  const c = auditContent.jump;
  return (
    <nav aria-label={c.label} className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="nwse-type-label nwse-label mr-1">{c.label}</span>
      {c.items.map((item) => (
        <a key={item.href} href={item.href} className="nwse-chip nwse-type-body-small font-medium">
          {item.label}
        </a>
      ))}
    </nav>
  );
}

/**
 * The metrics the engine gathers as a ledger, one row per group: its icon
 * and index, its name, what it covers, why it matters, its first three
 * metrics, and a link to the group's own page with every metric.
 */
function MetricsGrid() {
  const c = groundswellMetricsContent;
  return (
    <ol className="nwse-ledger mt-6 flex flex-col sm:mt-8 lg:mt-10" data-role="metric-groups">
      {groundswellMetricGroups.map((group, index) => {
        const color = accentAt(index);
        return (
          <li
            key={group.slug}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 sm:py-7 lg:grid-cols-[2.5rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-8 lg:py-8"
            data-role="metric-group"
          >
            <span className="col-start-1 row-start-1 flex flex-col items-start gap-2" style={{ color: color.deep }} aria-hidden="true">
              <NwseIcon name={group.icon} size={22} />
              <span className="nwse-type-label nwse-label tabular-nums">{String(index + 1).padStart(2, '0')}</span>
            </span>
            <div className="col-start-2 row-start-1">
              <h3 className="nwse-type-title-1 text-[var(--nw-current-navy)]">{group.name}</h3>
              <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{group.summary}</p>
            </div>
            <div className="col-start-2 lg:col-start-3 lg:row-start-1">
              <p className="nwse-type-label nwse-label">{c.mattersLabel}</p>
              <p className="nwse-type-body-small mt-1 text-[var(--nw-current-navy)]">{group.matters}</p>
            </div>
            <div className="col-start-2 flex flex-col items-start gap-3 lg:col-start-4 lg:row-start-1">
              <ul className="nwse-type-body-small flex flex-col gap-1 text-[var(--nw-slate)]" aria-label={`${group.name}: metrics`}>
                {group.metrics.slice(0, 3).map((metric) => (
                  <li key={metric.name} className="flex items-baseline gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: color.accent }} aria-hidden="true" />
                    {metric.name}
                  </li>
                ))}
              </ul>
              <Link
                to={groundswellMetricPath(group.slug)}
                className="nwse-link inline-flex items-center gap-1.5 text-sm font-semibold max-lg:min-h-11"
                aria-label={`${c.cardLink(group.metrics.length)}: ${group.name}`}
              >
                {c.cardLink(group.metrics.length)} <NwseIcon name="arrow-right" size={14} aria-hidden="true" />
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * The Currents as a dark explorer: one chip per source, with where it looks,
 * what it brings back, and, where the worked example has a figure, what it found.
 */
function CurrentsExplorer() {
  const c = auditContent.engine;
  const items: TabItem[] = auditConnectors.map((connector, index) => {
    const color = accentAt(index);
    return {
      id: connector.name.toLowerCase().replace(/\s+/g, '-'),
      title: connector.name,
      label: (
        <>
          <span className={`nwse-icon ${color.tile} h-7 w-7 shrink-0`} aria-hidden="true">
            <NwseIcon name={connector.icon} size={16} />
          </span>
          {connector.name}
        </>
      ),
      panel: (
        <div className="gs-current-panel grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8 lg:p-7">
          <div>
            <h3 className="gs-current-title nwse-type-title-1">{connector.name}</h3>
            <p className="gs-current-label nwse-type-label mt-4">{c.sourceLabel}</p>
            <p className="gs-current-copy nwse-type-body-small mt-1">{connector.source}</p>
            <p className="gs-current-label nwse-type-label mt-4">{c.gathersLabel}</p>
            <p className="gs-current-title nwse-type-body mt-1">{connector.gathers}</p>
          </div>
          {connector.example ? (
            <div className="gs-current-example self-start p-4 sm:p-5">
              <p className="gs-current-label nwse-type-label">{c.exampleLabel}</p>
              <p className="gs-current-title nwse-type-body mt-2">{connector.example}</p>
            </div>
          ) : null}
        </div>
      ),
    };
  });
  return <Tabs items={items} label={c.explorerLabel} look="chips" className="mt-6 sm:mt-8 lg:mt-10" bodyClassName="mt-4" />;
}

/** The three report formats as open columns, each under a rule in the next colour role. */
function ReportGrid() {
  return (
    <ol className="mt-6 grid grid-cols-1 gap-6 sm:mt-8 md:grid-cols-3 md:gap-8 lg:mt-10 lg:gap-10">
      {auditReports.map((report, index) => {
        const color = accentAt(index);
        return (
          <li key={report.name} className="nwse-rule relative flex flex-col pt-4 sm:pt-5" style={{ '--nwse-rule': color.accent } as CSSProperties}>
            <p className="nwse-type-label nwse-label">{report.audience}</p>
            <h3 className="nwse-type-title-1 mt-1 text-[var(--nw-current-navy)]">{report.name}</h3>
            <p className="nwse-type-body-small mt-1 font-semibold text-[var(--gs-navy)]">
              {report.format}
            </p>
            <p className="nwse-type-body-small mt-3 text-[var(--nw-slate)]">{report.detail}</p>
          </li>
        );
      })}
    </ol>
  );
}

/** The audit's key findings, from its one-page summary. */
function FindingsPanel() {
  return (
    <div>
      <p className="nwse-type-body-small text-[var(--nw-slate)]">{auditSample.businessNote}</p>
      <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-6 sm:mt-6 lg:grid-cols-4" data-role="findings">
        {auditSample.findings.map((finding) => (
          <li key={finding.value + finding.label}>
            <p className="nwse-type-display-2 tabular-nums text-[var(--nw-current-navy)]">{finding.value}</p>
            <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">{finding.label}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The return board: one card per scenario (they stack on phones), the base case outlined in amber, then its stop-loss and sources. */
function ReturnBoardPanel() {
  return (
    <div>
      <p className="nwse-type-body-small text-[var(--nw-slate)]">{auditSample.lever}</p>
      <ul className="mt-5 grid grid-cols-1 gap-3 sm:mt-6 md:grid-cols-3 md:gap-4" data-role="scenarios">
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
      <div className="nwse-type-body-small mt-5 flex flex-col gap-2 text-[var(--nw-slate)] sm:mt-6">
        <p>{auditSample.stopLoss}</p>
        <p>{auditSample.footnote}</p>
      </div>
    </div>
  );
}

// The brewery's ad plan, computed from its use-case inputs and the setup file: no number here is typed by hand.
const upbIndustry = GROUNDSWELL_CONFIG.industries.find((i) => i.id === UPB_INDUSTRY)!;
const upbPlan = buildAdPlan(UPB_ANGLES, upbIndustry, GROUNDSWELL_CONFIG);
const upbRanked = rankChanges(upbChanges(upbPlan, GROUNDSWELL_CONFIG), GROUNDSWELL_CONFIG);
const upbComparison = compareWithToday(upbRanked, UPB_BASELINE);

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
    r.recommendation === 'fund'
      ? 'text-[var(--nwse-lure-amber-deep)]'
      : r.recommendation === 'test'
        ? 'text-[var(--nw-tide-blue)]'
        : 'text-[var(--nw-slate)]';
  return (
    <div className="nwse-card mt-5 overflow-hidden sm:mt-6">
      <table className="w-full text-left max-md:block">
        <thead className="max-md:hidden">
          <tr className="border-b" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            {[c.columns.angle, c.columns.platform, c.columns.cpc, c.columns.clicks, c.columns.spend, c.columns.net, c.columns.call].map(
              (h) => (
                <th key={h} scope="col" className="nwse-type-label nwse-label px-4 py-3 font-normal lg:px-6">
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {shown.map((r) => (
            <tr
              key={`${r.angle_id}-${r.platform}`}
              className="border-b align-top last:border-b-0 max-md:block max-md:px-4 max-md:py-4"
              style={{ borderColor: 'var(--nw-mist-gray)' }}
            >
              <th
                scope="row"
                className="nwse-type-body-small px-4 py-3 font-semibold text-[var(--nw-current-navy)] max-md:block max-md:p-0 lg:px-6"
              >
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
          <p
            className="nwse-type-body-small border-t px-4 py-3 text-[var(--nw-slate)] lg:px-6"
            style={{ borderColor: 'var(--nw-mist-gray)' }}
          >
            <span className="font-semibold text-[var(--nw-current-navy)]">{auditContent.adPlan.conditionsHeading}: </span>
            {rules.join(' ')}
          </p>
        ) : null;
      })()}
      {upbPlan.unmodeled.length ? (
        <p
          className="nwse-type-body-small border-t px-4 py-3 text-[var(--nw-slate)] lg:px-6"
          style={{ borderColor: 'var(--nw-mist-gray)' }}
        >
          <span className="font-semibold text-[var(--nw-current-navy)]">{c.unmodeledHeading}: </span>
          {[...new Set(upbPlan.unmodeled.map((u) => u.reason))].join(' ')}
        </p>
      ) : null}
    </div>
  );
}

/** The ad plan panel: its heading, intro, the board, and its footnote. */
function AdPlanPanel() {
  const c = auditContent.adPlan;
  return (
    <div>
      <h3 className="nwse-type-title-1 text-[var(--nw-current-navy)]">{c.heading}</h3>
      <p className="nwse-type-body-small mt-2 max-w-3xl text-[var(--nw-slate)]">{c.intro}</p>
      <AdPlanBoard />
      <p className="nwse-type-body-small mt-3 max-w-4xl text-[var(--nw-slate)]">{c.footnote}</p>
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
    <div>
      <h3 className="nwse-type-title-1 text-[var(--nw-current-navy)]">{c.templatesHeading}</h3>
      <p className="nwse-type-body-small mt-2 max-w-3xl text-[var(--nw-slate)]">{c.templatesIntro}</p>
      <ul className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        {PREVIEWS.map(({ platform, angle }) => {
          const t = UPB_TEMPLATES.find((x) => x.platform === platform && x.angle_id === angle)!;
          const p = GROUNDSWELL_CONFIG.platforms[platform];
          const row = upbPlan.rows.find((r) => r.platform === platform && r.angle_id === angle);
          const status = row
            ? `${c.calls[row.recommendation]}: ${row.reason}`
            : (upbPlan.unmodeled.find((u) => u.platform === platform)?.reason ?? '');
          return (
            <li key={`${platform}-${angle}`} className="nwse-card flex flex-col p-4 sm:p-5">
              <p className="nwse-type-label nwse-label">
                {p.label} · {p.template.format}
              </p>
              <dl className="mt-3 flex flex-col gap-2">
                {Object.entries(t.fields).map(([field, value]) => (
                  <div key={field}>
                    <dt className="nwse-type-body-small text-[var(--nw-slate)]">{field.replace(/_/g, ' ').replace(/(\d)$/, ' $1')}</dt>
                    <dd className="nwse-type-body-small text-[var(--nw-current-navy)]">
                      {Array.isArray(value) ? value.join(' · ') : value}
                    </dd>
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

/** Benefit per dollar of cost (team time and spend), as "$1.73"; no percentages on the page. */
function backPerDollar(c: RankedChange) {
  const m = c.scenarios?.medium;
  if (!m || m.cost_year <= 0) return auditContent.changes.notModeled;
  return `$${(m.benefit_year / m.cost_year).toFixed(2)}`;
}

function ChangeRanking() {
  const c = auditContent.changes;
  return (
    <div className="nwse-card mt-5 overflow-hidden sm:mt-6">
      <table className="w-full text-left max-md:block">
        <thead className="max-md:hidden">
          <tr className="border-b" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            {[c.columns.rank, c.columns.change, c.columns.area, c.columns.hours, c.columns.net, c.columns.back].map((h) => (
              <th key={h} scope="col" className="nwse-type-label nwse-label px-4 py-3 font-normal lg:px-6">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {upbRanked.map((ch) => (
            <tr
              key={ch.id}
              className="border-b align-top last:border-b-0 max-md:block max-md:px-4 max-md:py-4"
              style={{ borderColor: 'var(--nw-mist-gray)' }}
            >
              <td className="nwse-type-body-small px-4 py-3 tabular-nums text-[var(--nw-slate)] max-md:inline max-md:p-0 max-md:pr-2 lg:px-6">
                {ch.rank}
              </td>
              <th
                scope="row"
                className="nwse-type-body-small px-4 py-3 text-left font-semibold text-[var(--nw-current-navy)] max-md:inline max-md:p-0 lg:px-6"
              >
                {ch.title}
                <span className="mt-1 block font-normal text-[var(--nw-slate)]">
                  {ch.impact.kind === 'not_modeled' ? ch.impact.reason : ch.evidence}
                </span>
              </th>
              <td className="nwse-type-body-small px-4 py-3 text-[var(--nw-slate)] max-md:mt-2 max-md:block max-md:p-0 lg:px-6">
                <span className="md:hidden">{c.columns.area}: </span>
                {c.areas[ch.area]}
              </td>
              <td className="nwse-type-body-small px-4 py-3 tabular-nums text-[var(--nw-current-navy)] max-md:block max-md:p-0 lg:px-6">
                <span className="md:hidden">{c.columns.hours}: </span>
                {Math.round(ch.hours)}
              </td>
              <td className="nwse-type-body-small px-4 py-3 tabular-nums text-[var(--nw-current-navy)] max-md:block max-md:p-0 lg:px-6">
                <span className="md:hidden">{c.columns.net}: </span>
                {ch.scenarios ? `${dollars(ch.scenarios.low.net_year)} to ${dollars(ch.scenarios.high.net_year)}` : c.notModeled}
              </td>
              <td className="nwse-type-body-small px-4 py-3 font-semibold tabular-nums text-[var(--nw-current-navy)] max-md:block max-md:p-0 lg:px-6">
                <span className="font-normal md:hidden">{c.columns.back}: </span>
                {backPerDollar(ch)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** The business as set up today against the plan, side by side. */
function TodayVsPlan() {
  const c = auditContent.changes;
  const w = upbComparison.with_plan;
  const cell = (label: string, value: string) => (
    <div className="flex items-baseline justify-between gap-4 border-t py-2.5" style={{ borderColor: 'var(--nw-mist-gray)' }}>
      <dt className="nwse-type-body-small text-[var(--nw-slate)]">{label}</dt>
      <dd className="nwse-type-body-small text-right font-semibold tabular-nums text-[var(--nw-current-navy)]">{value}</dd>
    </div>
  );
  return (
    <div className="mt-5 grid grid-cols-1 gap-6 sm:mt-6 md:grid-cols-2 md:gap-8">
      <div className="nwse-rule pt-4">
        <h4 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{c.todayHeading}</h4>
        <dl className="mt-3">
          {cell(c.labels.adSpend, UPB_BASELINE.monthly_ad_spend === null ? 'Not public' : dollars(UPB_BASELINE.monthly_ad_spend))}
          {cell(c.labels.customers, '0')}
          {cell(c.labels.net, '$0')}
        </dl>
        <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{UPB_BASELINE.ad_spend_basis}</p>
      </div>
      <div className="nwse-rule pt-4" style={{ '--nwse-rule': 'var(--nwse-lure-amber-deep)' } as CSSProperties}>
        <h4 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{c.planHeading}</h4>
        <dl className="mt-3">
          {cell(c.labels.addedSpend, dollars(w.added_monthly_spend.medium))}
          {cell(c.labels.hours, String(Math.round(w.team_hours)))}
          {cell(c.labels.customers, w.extra_customers_month.medium.toFixed(1))}
          {cell(
            c.labels.net,
            `${dollars(w.net_year.low)} to ${dollars(w.net_year.high)} (${dollars(w.net_year.medium)} ${c.labels.medium})`,
          )}
        </dl>
        <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">
          {upbRanked
            .filter((ch) => upbComparison.included.includes(ch.id))
            .map((ch) => ch.title)
            .join(' · ')}
        </p>
      </div>
    </div>
  );
}

/** Every change ranked: its heading, intro, today against the plan, the ranking, and its footnote. */
function ChangesPanel() {
  const c = auditContent.changes;
  return (
    <div>
      <h3 className="nwse-type-title-1 text-[var(--nw-current-navy)]">{c.heading}</h3>
      <p className="nwse-type-body-small mt-2 max-w-3xl text-[var(--nw-slate)]">{c.intro}</p>
      <TodayVsPlan />
      <ChangeRanking />
      <p className="nwse-type-body-small mt-3 max-w-4xl text-[var(--nw-slate)]">{c.footnote}</p>
    </div>
  );
}

/**
 * The worked example as one report viewer: a navy head with the business,
 * the audit's date and its headline demand, and the parts of the audit as
 * tabs; the chosen part in the white body below, with Back and Next to read
 * it in order and the discovery call at the end.
 */
function SampleViewer() {
  const c = auditContent.sample;
  const items: TabItem[] = [
    { id: 'findings', title: c.tabs.findings, panel: <FindingsPanel /> },
    { id: 'board', title: c.tabs.board, panel: <ReturnBoardPanel /> },
    { id: 'adplan', title: c.tabs.adPlan, panel: <AdPlanPanel /> },
    { id: 'ads', title: c.tabs.ads, panel: <TemplatePreviews /> },
    { id: 'changes', title: c.tabs.changes, panel: <ChangesPanel /> },
  ];
  return (
    <div className="nwse-card mt-6 overflow-hidden sm:mt-8 lg:mt-10" data-role="sample-viewer">
      <Tabs
        items={items}
        label={c.viewerLabel}
        look="dark"
        guided
        nextLabel={auditContent.guide.next}
        backLabel={auditContent.guide.back}
        finish={<PrimaryCta tone="light" />}
        headClassName="nwse-dark bg-[var(--nw-current-navy)] px-4 pt-4 sm:px-6 sm:pt-5"
        bodyClassName="p-4 sm:p-6 lg:p-8"
        header={
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8 sm:pb-5">
            <div className="max-w-2xl">
              <p className="nwse-type-label" style={{ color: 'var(--nwse-lure-amber)' }}>
                {auditSample.label}
              </p>
              <h3 className="nwse-type-title-1 mt-1 text-[var(--nw-cloud-white)]">{auditSample.business}</h3>
            </div>
            <div className="sm:text-right">
              <p className="nwse-type-display-2 tabular-nums text-[var(--nw-cloud-white)]">{auditSample.demand.value}</p>
              <p className="nwse-type-body-small text-[var(--nw-mist-gray)]">{auditSample.demand.label}</p>
            </div>
          </div>
        }
      />
    </div>
  );
}

/**
 * The GroundSwell page: the audit explained one part at a time. Hero (with a
 * second button straight to the example); the in-page links; the metrics it
 * gathers, one card per group, each linking to its own page; the five steps
 * as a stepper; the Currents as an explorer; the worked example as a report
 * viewer, then the call to action; the three reports; how the audit grows;
 * questions; the closing call. Brand surfaces distinguish each part of the audit.
 */
export default function SocialEngineeringGroundswellPage() {
  useDivisionMeta(seo);
  const content = auditContent;

  return (
    <GroundswellMarketingLayout>
      <GroundswellHero />

      <SectionBand surface="navigation" compact>
        <JumpNav />
      </SectionBand>

      <SectionBand surface="sample" id="metrics" labelledBy="nwse-audit-metrics">
        <SectionIntro
          kicker={groundswellMetricsContent.kicker}
          title={groundswellMetricsContent.heading}
          description={groundswellMetricsContent.intro}
          id="nwse-audit-metrics"
        />
        <MetricsGrid />
      </SectionBand>

      <SectionBand surface="foam" id="how-it-works" labelledBy="nwse-audit-process">
        <SectionIntro
          kicker={content.process.kicker}
          title={content.process.heading}
          description={content.process.intro}
          id="nwse-audit-process"
        />
        <GroundswellProcess />
      </SectionBand>

      <SectionBand surface="navy" id="currents" labelledBy="nwse-audit-engine">
        <SectionIntro
          kicker={content.engine.kicker}
          title={content.engine.heading}
          description={content.engine.intro}
          id="nwse-audit-engine"
          tone="dark"
        />
        <CurrentsExplorer />
        <CheckList items={content.rules} tone="dark" />
      </SectionBand>

      <SectionBand surface="sample" id="sample" labelledBy="nwse-audit-sample">
        <SectionIntro
          kicker={content.sample.kicker}
          title={content.sample.heading}
          description={content.sample.intro}
          id="nwse-audit-sample"
        />
        <SampleViewer />
        <CtaStrip heading={content.sample.cta.heading} body={content.sample.cta.body} />
      </SectionBand>

      <SectionBand surface="amber" id="reports" labelledBy="nwse-audit-reports">
        <SectionIntro
          kicker={content.reports.kicker}
          title={content.reports.heading}
          description={content.reports.intro}
          id="nwse-audit-reports"
        />
        <ReportGrid />
      </SectionBand>

      <SectionBand surface="navy" id="growth" labelledBy="nwse-audit-growth">
        <SectionIntro
          kicker={content.growth.kicker}
          title={content.growth.heading}
          description={content.growth.intro}
          id="nwse-audit-growth"
          tone="dark"
        />
        <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-8 md:grid-cols-2 md:gap-4 lg:mt-10">
          {content.growth.groups.map((group, index) => {
            const color = accentAt(index);
            return (
              <div key={group.title} className="gs-growth-panel p-4 sm:p-5 lg:p-6">
                <h3 className="nwse-type-title-2 text-[var(--gs-white)]">{group.title}</h3>
                <CheckList items={group.items} color={color} tone="dark" />
              </div>
            );
          })}
        </div>
      </SectionBand>

      <SectionBand surface="foam" id="questions" labelledBy="nwse-audit-faq">
        <SectionIntro kicker="Questions" title="Common questions" id="nwse-audit-faq" />
        <FaqList faqs={content.faqs} />
      </SectionBand>

      <CtaBand heading={content.cta.heading} body={content.cta.body} />
    </GroundswellMarketingLayout>
  );
}
