import { Link } from 'react-router-dom';
import { DivisionLayout } from '../components/DivisionLayout';
import { FamilyLockup } from '../components/FamilyLockup';
import { GrowthLoop } from '../components/GrowthLoop';
import { GROWTH_LOOP_NODES, type GrowthLoopNodeKey } from '../components/growthLoop';
import { ServiceIcon } from '../components/ServiceIcon';
import {
  Band,
  CadenceRow,
  ChipList,
  CtaBand,
  DarkCurrents,
  DivisionHero,
  FaqList,
  JourneyStrip,
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
import { PARENT_NAME, divisionServicePath } from '../site';
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

export default function SocialEngineeringHubPage() {
  useDivisionMeta(seo);
  const content = hubContent;

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        scene="hub"
        kickerInHeading
        kicker={content.kicker}
        headline={content.headline}
        summary={content.summary}
        facts={HERO_FACTS}
        actions={
          <>
            <PrimaryCta />
            <a href="#pillars" className="nwse-btn nwse-btn-ghost-dark">
              How it works
            </a>
          </>
        }
      />

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
          {/* The growth loop: the drawing is decorative; the list beside it says the same in words. */}
          <figure className="nwse-card p-4 sm:p-6" data-role="growth-system">
            <GrowthLoop />
            <figcaption className="mt-4 border-t pt-4 sm:mt-5 sm:pt-5" style={{ borderColor: 'var(--nw-mist-gray)' }}>
              <p className="nwse-type-label nwse-label">The growth loop</p>
              <ol className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
                {GROWTH_LOOP_NODES.map(({ key }, index) => (
                  <li key={key} className="flex gap-3">
                    <span className="nwse-type-label nwse-type-numeric mt-0.5 shrink-0 text-[var(--nwse-lure-amber-deep)]" aria-hidden="true">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="nwse-type-body-small text-[var(--nw-slate)]">
                      <span className="font-semibold text-[var(--nw-current-navy)]">{LOOP_STEPS[key].title}. </span>
                      {LOOP_STEPS[key].detail}
                    </span>
                  </li>
                ))}
              </ol>
            </figcaption>
          </figure>
        </div>
      </Band>

      <Band id="pillars" labelledBy="nwse-pillars">
        <SectionIntro
          kicker="What we’re built on"
          title="Data, integrations, and smart advertising, working as one system"
          description="Each pillar is useful on its own. Together they are why the advertising budget can answer for sales: the data says where to spend, the integrations capture what it brings in, and the reporting shows it."
          id="nwse-pillars"
        />
        <PillarCards pillars={content.pillars} />
      </Band>

      <Band tone="white" id="services" labelledBy="nwse-services">
        <SectionIntro
          kicker="Services"
          title="Six services, one goal: more sales you can trace"
          description="Take one, or the set. Every service plugs into the same tracking and the same monthly report."
          id="nwse-services"
        />
        {/* Below lg each service is a row (icon, title, and arrow on one line, the
            summary beneath) and the whole row is the link; below md the rows are
            grouped into one list. From lg, the cards as before. The minmax(0, …)
            tracks let a row shrink to the panel when text is enlarged, so the
            panel's overflow never clips it. */}
        <ul className="nwse-rowlist mt-6 grid grid-cols-1 gap-0 sm:mt-8 md:gap-4 md:grid-cols-2 lg:mt-10 lg:grid-cols-3">
          {divisionServices.map((service) => (
            <li key={service.slug}>
              <Link
                to={divisionServicePath(service.slug)}
                className="nwse-card group grid h-full grid-cols-[2.25rem_minmax(0,1fr)_1.125rem] content-start items-center gap-x-3 gap-y-1.5 p-4 transition-colors hover:border-[var(--nwse-lure-amber)] sm:p-5 lg:flex lg:flex-col lg:items-stretch lg:gap-0 lg:p-6"
              >
                <div className="contents lg:flex lg:items-start lg:justify-between">
                  <span className="nwse-icon col-start-1 row-start-1 h-9 w-9 lg:h-11 lg:w-11">
                    <ServiceIcon icon={service.icon} size={20} />
                  </span>
                  <NwseIcon
                    name="arrow-up-right"
                    size={18}
                    className="col-start-3 row-start-1 justify-self-end text-[var(--nw-slate)] transition-colors group-hover:text-[var(--nwse-lure-amber-deep)]"
                  />
                </div>
                <h3 className="nwse-type-title-1 col-start-2 row-start-1 text-[var(--nw-current-navy)] max-lg:break-words lg:mt-5">{service.navLabel}</h3>
                <p className="nwse-type-body-small col-span-3 flex-1 text-[var(--nw-slate)] lg:mt-2">{service.cardSummary}</p>
                <span className="nwse-link mt-5 hidden items-center gap-1.5 text-sm lg:inline-flex">
                  Learn more <span className="sr-only">about {service.navLabel.toLowerCase()}</span>
                  <NwseIcon name="arrow-right" size={14} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      <Band labelledBy="nwse-data">
        <SectionIntro
          kicker="Discovery"
          title="Every touchpoint, mapped to the customer journey"
          description="Before anything is recommended, the audit and discovery put the whole business on one map: where demand is, how customers move, and what can be measured."
          id="nwse-data"
        />
        <JourneyStrip stages={content.journey} />
        {/* The journey scene fills the grid's empty sixth cell from lg. */}
        <PointGrid points={content.dataWeGather} scene="hubSection" />
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

      <Band tone="white" labelledBy="nwse-industries">
        <SectionIntro kicker="Who we work with" title={content.industries.heading} description={content.industries.intro} id="nwse-industries" />
        <ChipList items={content.industries.items} label="Kinds of business we work with" />
        <p className="nwse-type-body-small mt-5 max-w-3xl text-[var(--nw-slate)] sm:mt-6">{content.industries.note}</p>
      </Band>

      <section
        aria-labelledby="nwse-metrics"
        className="nwse-dark relative overflow-hidden py-10 sm:py-14 lg:py-20"
        style={{ background: 'var(--nw-deep-current)' }}
      >
        <DarkCurrents />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="nwse-type-kicker nwse-kicker-on-dark">What we measure</p>
          <h2 id="nwse-metrics" className="nwse-type-display-2 mt-2 max-w-3xl text-[var(--nw-cloud-white)] sm:mt-3">
            Measured against sales, not activity
          </h2>
          <p className="nwse-type-body mt-3 max-w-2xl text-[var(--nw-mist-gray)] sm:mt-4">
            The same five measures on every report, defined the same way every month, so the numbers can be compared and the budget can follow them.
          </p>
          <dl className="mt-6 grid grid-cols-1 gap-x-8 gap-y-0 sm:mt-8 md:gap-y-6 md:grid-cols-2 lg:mt-10 lg:grid-cols-3 md:max-lg:[&>div:last-child:nth-child(odd)]:col-span-2">
            {content.metrics.map((metric) => (
              <div key={metric.title} className="border-t py-4 md:pb-0 md:pt-5" style={{ borderColor: 'color-mix(in srgb, var(--nw-slate) 70%, transparent)' }}>
                <dt className="flex items-center gap-3">
                  {metric.icon ? <NwseIcon name={metric.icon} size={24} className="shrink-0 text-[var(--nw-cloud-white)] max-sm:h-5 max-sm:w-5" /> : null}
                  <span className="nwse-type-label" style={{ color: 'var(--nwse-lure-amber)' }}>
                    {metric.title}
                  </span>
                </dt>
                <dd className="nwse-type-body-small mt-1.5 text-[var(--nw-mist-gray)] sm:mt-2">{metric.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Band labelledBy="nwse-family">
        {/* Phones: flush on the gutter like every other band (.nwse-familycard). */}
        <div className="nwse-card nwse-familycard grid gap-0 p-5 sm:gap-8 sm:p-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
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
