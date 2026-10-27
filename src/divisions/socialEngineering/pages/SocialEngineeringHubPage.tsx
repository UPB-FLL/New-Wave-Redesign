import { Link } from 'react-router-dom';
import { DivisionLayout } from '../components/DivisionLayout';
import { FamilyLockup } from '../components/FamilyLockup';
import { GrowthLoop } from '../components/GrowthLoop';
import { GROWTH_LOOP_NODES, type GrowthLoopNodeKey } from '../components/growthLoop';
import { PILLAR_STYLE } from '../components/pillarStyle';
import { ServiceIcon } from '../components/ServiceIcon';
import { GroundswellEngine } from '../components/GroundswellEngine';
import {
  Band,
  CadenceRow,
  ChipList,
  CtaBand,
  DivisionHero,
  FaqList,
  JourneyStrip,
  MetricTiles,
  PillarCards,
  PointGrid,
  PrimaryCta,
  RoadmapGrid,
  SectionIntro,
  StepList,
} from '../components/sections';
import { divisionServices, hubContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { hubPageSeo } from '../seo';
import { DIVISION_HEADWAY_PATH, PARENT_NAME, divisionServicePath } from '../site';
import { HEADWAY_NAME } from '../../../lib/headway';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = hubPageSeo();

/** Under the hero summary: how the division works, in three short facts (no numbers; one line from lg). */
const HERO_FACTS = ['Nationwide', 'Remote-first', 'Reported against revenue'] as const;

/** The loop's four steps, in the drawing's order, named beside it. */
const LOOP_STEPS: Record<GrowthLoopNodeKey, { title: string; detail: string }> = {
  data: { title: 'Data', detail: 'The audit and the tracking say where the demand is and what it costs.' },
  integrations: { title: 'Integrations', detail: 'Your tools are connected, so every lead and sale is captured and traced.' },
  advertising: { title: 'Smart advertising', detail: 'Campaigns bid on that data and land on pages that can take the order.' },
  sales: { title: 'Sales', detail: 'Revenue flows back into the reporting and sets the next decision.' },
};

/** Each loop step's icon colour: the pillar roles, then amber for sales. */
const LOOP_STEP_COLORS: Record<GrowthLoopNodeKey, string> = {
  data: PILLAR_STYLE.data.onDark,
  integrations: PILLAR_STYLE.integrations.onDark,
  advertising: PILLAR_STYLE.advertising.onDark,
  sales: 'var(--nwse-lure-amber)',
};

/**
 * The hub. Its bands alternate grounds and box treatments so no two
 * neighbours look alike: Deep Current hero; white with the loop in a navy
 * panel; navy with glass pillar tiles; white with hairline service cards;
 * Cloud White with soft tiles and the journey scene; white with the stepper;
 * Cloud White with capped phase cards; Deep Current with glass metric tiles;
 * white with chips; Cloud White with the family card; white with the FAQ
 * list; the gradient call to action.
 */
export default function SocialEngineeringHubPage() {
  useDivisionMeta(seo);
  const content = hubContent;

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        scene="hub"
        // The GroundSwell panel: beside the text only. Under the buttons on a
        // phone it read as a second hero, its caption wrapping in the narrow box.
        sceneOnPhones="hide"
        kickerInHeading
        kicker={content.kicker}
        headline={content.headline}
        summary={content.summary}
        facts={HERO_FACTS}
        actions={
          <>
            <PrimaryCta />
            <a href="#groundswell-engine" className="nwse-btn nwse-btn-ghost-dark">
              Meet the engine
            </a>
          </>
        }
      />

      <GroundswellEngine />

      <Band tone="white" labelledBy="nwse-intro">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <SectionIntro kicker="The opportunity" title={content.intro.heading} id="nwse-intro" />
            <div className="nwse-type-body mt-4 flex max-w-3xl flex-col gap-4 text-[var(--nw-slate)] sm:mt-6">
              {content.intro.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          {/* The growth loop in a navy panel: the drawing is decorative; the list beside it says the same in words. */}
          <figure className="rounded-2xl p-5 sm:p-7" style={{ background: 'var(--nw-current-navy)' }} data-role="growth-system">
            <GrowthLoop tone="dark" />
            <figcaption className="mt-4 border-t pt-4 sm:mt-5 sm:pt-5" style={{ borderColor: 'color-mix(in srgb, var(--nw-cloud-white) 14%, transparent)' }}>
              <p className="nwse-type-kicker nwse-kicker-on-dark">The growth loop, powered by GroundSwell</p>
              <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {GROWTH_LOOP_NODES.map(({ key, icon }) => (
                  <li key={key} className="flex gap-3">
                    <span className="mt-0.5 shrink-0" style={{ color: LOOP_STEP_COLORS[key] }}>
                      <NwseIcon name={icon} size={20} />
                    </span>
                    <span className="nwse-type-body-small text-[var(--nw-mist-gray)]">
                      <span className="font-semibold text-[var(--nw-cloud-white)]">{LOOP_STEPS[key].title}. </span>
                      {LOOP_STEPS[key].detail}
                    </span>
                  </li>
                ))}
              </ol>
            </figcaption>
          </figure>
        </div>
      </Band>

      <Band tone="navy" id="pillars" labelledBy="nwse-pillars">
        <SectionIntro
          tone="dark"
          kicker="What we’re built on"
          title="Data, integrations, and smart advertising, working as one system"
          description="GroundSwell brings the research and plan together. Our team connects the tools and runs the campaigns, so the work follows the evidence and the reporting informs the next decision."
          id="nwse-pillars"
        />
        <PillarCards pillars={content.pillars} tone="dark" />
      </Band>

      <Band tone="white" id="services" labelledBy="nwse-services">
        <SectionIntro
          kicker={`${HEADWAY_NAME} · the implementation service`}
          title="One service that carries the plan out, six kinds of work under it"
          description={`GroundSwell finds and plans; ${HEADWAY_NAME} does. Take one kind of work, or the set: each starts from the same plan, runs through your own accounts where a tool can and our team where it should, and every action is approved first.`}
          id="nwse-services"
        />
        {/* A ledger, not a grid of cards: each service is one row under a
            hairline (its icon in its pillar's colour, the title, the summary,
            an arrow; no index), the whole row the link; two columns of rows from lg. */}
        <ol className="nwse-ledger mt-6 grid grid-cols-1 sm:mt-8 lg:mt-10 lg:grid-cols-2 lg:gap-x-12" data-role="service-ledger">
          {divisionServices.map((service) => {
            const color = PILLAR_STYLE[service.pillar];
            return (
              <li key={service.slug}>
                <Link
                  to={divisionServicePath(service.slug)}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-start gap-x-4 gap-y-1.5 py-5 sm:py-6 lg:py-7"
                >
                  <span className="col-start-1 row-start-1 mt-0.5" style={{ color: color.deep }} aria-hidden="true">
                    <ServiceIcon icon={service.icon} size={22} />
                  </span>
                  <h3 className="nwse-type-title-1 col-start-2 row-start-1 text-[var(--nw-current-navy)] transition-colors group-hover:text-[var(--nwse-lure-amber-deep)] max-lg:break-words">
                    {service.navLabel}
                  </h3>
                  <NwseIcon name="arrow-up-right" size={20} className="nwse-ledger-arrow col-start-3 row-start-1 mt-1 justify-self-end text-[var(--nw-slate)]" />
                  <p className="nwse-type-body-small col-start-2 row-start-2 text-[var(--nw-slate)]">{service.cardSummary}</p>
                </Link>
              </li>
            );
          })}
        </ol>
        <Link to={DIVISION_HEADWAY_PATH} className="nwse-link mt-6 inline-flex items-center gap-1.5 text-sm font-semibold max-lg:min-h-11 sm:mt-8" data-role="headway-link">
          How {HEADWAY_NAME} works <NwseIcon name="arrow-right" size={14} />
        </Link>
      </Band>

      <Band labelledBy="nwse-data">
        {/* The journey scene sits beside the intro from lg. */}
        <SectionIntro
          kicker="Discovery"
          title="Every touchpoint, mapped to the customer journey"
          description="Before anything is recommended, the audit and discovery put the whole business on one map: where demand is, how customers move, and what can be measured."
          id="nwse-data"
          scene="hubSection"
        />
        <JourneyStrip stages={content.journey} />
        {/* Soft tiles, coloured bars in rotation; the five tiles centre their second row under the first. */}
        <PointGrid points={content.dataWeGather} variant="soft" accents="cycle" />
      </Band>

      <Band tone="white" id="process" labelledBy="nwse-method">
        <SectionIntro
          kicker="How we work"
          title="Audit, plan, build and run"
          description="Nothing is built before it has been measured and prioritized, and nothing runs without a number it answers to."
          id="nwse-method"
        />
        <StepList steps={content.method} />
      </Band>

      <Band labelledBy="nwse-roadmap">
        <SectionIntro
          kicker="The first 90 days"
          title="A 90-day plan, then a rhythm that holds"
          description="Foundation first, demand second, scale third. After that the work runs on a weekly, monthly, and quarterly beat."
          id="nwse-roadmap"
        />
        <RoadmapGrid phases={content.roadmap} />
        <CadenceRow cadence={content.cadence} />
      </Band>

      <Band tone="dark" labelledBy="nwse-metrics">
        <SectionIntro
          tone="dark"
          kicker="What we measure"
          title="Measured against sales, not activity"
          description="The same five measures on every report, defined the same way every month, so the numbers can be compared and the budget can follow them."
          id="nwse-metrics"
        />
        <MetricTiles metrics={content.metrics} />
      </Band>

      <Band tone="white" labelledBy="nwse-industries">
        <SectionIntro kicker="Who we work with" title={content.industries.heading} description={content.industries.intro} id="nwse-industries" />
        <ChipList items={content.industries.items} label="Kinds of business we work with" />
        <p className="nwse-type-body-small mt-5 max-w-3xl text-[var(--nw-slate)] sm:mt-6">{content.industries.note}</p>
      </Band>

      <Band labelledBy="nwse-family">
        {/* An open two-column band under a hairline, not a card (phones: flush on the gutter, .nwse-familycard). */}
        <div className="nwse-familycard grid gap-0 border-t pt-8 sm:gap-8 sm:pt-10 lg:grid-cols-[1fr_1.4fr] lg:items-center" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          {/* Decorative (both logos alt=""), and on phones it would repeat the
              heading; the footer's family lockup is a scroll away. */}
          <div className="hidden sm:flex sm:justify-start">
            <FamilyLockup ground="light" direction="responsive" labelled />
          </div>
          <div>
            <SectionIntro kicker="Part of New Wave IT" title={content.relationship.heading} id="nwse-family" />
            <div className="nwse-type-body mt-3 flex flex-col gap-4 text-[var(--nw-slate)] sm:mt-5">
              {content.relationship.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <Link to="/" className="nwse-link mt-3 inline-flex items-center gap-1.5 text-sm max-lg:min-h-11 lg:mt-6">
              Visit {PARENT_NAME}
              <NwseIcon name="arrow-up-right" size={14} />
            </Link>
          </div>
        </div>
      </Band>

      <Band tone="white" id="faq" labelledBy="nwse-faq">
        <SectionIntro kicker="FAQ" title="Questions we hear first" id="nwse-faq" />
        <FaqList faqs={content.faqs} />
      </Band>

      <CtaBand heading={content.cta.heading} body={content.cta.body} />
    </DivisionLayout>
  );
}
