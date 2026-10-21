import { Link } from 'react-router-dom';
import { DivisionLayout } from '../components/DivisionLayout';
import { ServiceIcon } from '../components/ServiceIcon';
import {
  Band,
  CheckList,
  CtaBand,
  DivisionHero,
  FaqList,
  GlanceStrip,
  MetricLabels,
  OutcomeList,
  PillarStrip,
  PointGrid,
  PrimaryCta,
  SectionIntro,
  StepList,
} from '../components/sections';
import { divisionServices, findDivisionService, hubContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { isScenePageKey } from '../motion/scenes';
import { servicePageSeo } from '../seo';
import { DIVISION_BASE_PATH, divisionServicePath } from '../site';
import type { DivisionServiceContent } from '../types';
import { useDivisionMeta } from '../useDivisionMeta';

export default function SocialEngineeringServicePage({ slug }: { slug: string }) {
  const service = findDivisionService(slug);
  // Routes are registered from DIVISION_SERVICE_SLUGS, which a test keeps in
  // lockstep with the content, so a miss here is a programming error.
  if (!service) throw new Error(`Unknown social engineering service: ${slug}`);
  return <ServicePageBody service={service} />;
}

/**
 * Every service page reads the same way: the hero, the facts at a glance,
 * what changes for the business, what is included, how the work runs, what
 * you receive and what we report on, where the service sits in the growth
 * system, the questions, the related services, and the call to discovery.
 */
function ServicePageBody({ service }: { service: DivisionServiceContent }) {
  const seo = servicePageSeo(service);
  useDivisionMeta(seo);
  const related = divisionServices.filter((candidate) => candidate.slug !== service.slug);

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        // Every service slug has a scene (a test holds the registry to DIVISION_SERVICE_SLUGS).
        scene={isScenePageKey(service.slug) ? service.slug : undefined}
        sceneOnPhones="wide"
        sceneSize={service.heroSceneSize ?? 'large'}
        kicker={service.kicker}
        headline={service.headline}
        summary={service.summary}
        actions={
          <>
            <PrimaryCta />
            <Link to={DIVISION_BASE_PATH} className="nwse-btn nwse-btn-ghost-dark">
              All services
            </Link>
          </>
        }
      />

      <Band tone="white" size="compact" labelledBy="nwse-glance">
        <h2 id="nwse-glance" className="sr-only">
          At a glance
        </h2>
        <GlanceStrip items={service.glance} labelledBy="nwse-glance" />
      </Band>

      <Band labelledBy="nwse-outcomes">
        <SectionIntro kicker="Outcomes" title="What changes for the business" id="nwse-outcomes" />
        <OutcomeList outcomes={service.outcomes} />
      </Band>

      <Band tone="white" labelledBy="nwse-scope">
        <SectionIntro kicker="Scope" title={service.scopeHeading ?? 'What’s included'} id="nwse-scope" />
        <PointGrid points={service.scope} />
      </Band>

      <Band labelledBy="nwse-steps">
        <SectionIntro
          kicker="How it works"
          title="How the work runs"
          description="The same order as every engagement: audit, plan, build, then report every month."
          id="nwse-steps"
        />
        <StepList steps={service.process} />
      </Band>

      <Band tone="white" labelledBy="nwse-deliverables">
        <div className="grid gap-8 sm:gap-10 md:grid-cols-2">
          <div>
            <SectionIntro kicker="Deliverables" title="What you receive" id="nwse-deliverables" />
            <CheckList items={service.deliverables} />
          </div>
          <div>
            <SectionIntro kicker="Reporting" title="What we report on" />
            <div className="mt-4 sm:mt-6">
              <MetricLabels labels={service.metrics} />
            </div>
          </div>
        </div>
      </Band>

      <Band labelledBy="nwse-system">
        <SectionIntro
          kicker="Where it fits"
          title="One of six services in one growth system"
          description="Every service serves one of the three pillars first and plugs into the same tracking and the same monthly report."
          id="nwse-system"
        />
        <PillarStrip pillars={hubContent.pillars} active={service.pillar} />
      </Band>

      <Band tone="white" id="faq" labelledBy="nwse-faq">
        <SectionIntro kicker="FAQ" title="Common questions" id="nwse-faq" />
        <FaqList faqs={service.faqs} />
      </Band>

      <Band labelledBy="nwse-related">
        <SectionIntro kicker="Related services" title="Works best alongside" id="nwse-related" />
        {/* Below lg each service is a row: icon, title, and arrow on one line, the
            summary beneath, the whole row the link (grouped into one list below
            md). From lg, the cards as before. minmax(0, …) tracks keep the rows
            inside the panel when text is enlarged. */}
        <ul className="nwse-rowlist mt-6 grid grid-cols-1 gap-0 sm:mt-8 md:gap-4 md:grid-cols-2 lg:grid-cols-3 md:max-lg:[&>li:last-child:nth-child(odd)]:col-span-2">
          {related.map((item) => (
            <li key={item.slug}>
              <Link
                to={divisionServicePath(item.slug)}
                className="nwse-card group grid h-full grid-cols-[2.25rem_minmax(0,1fr)_1rem] content-start items-center gap-x-3 gap-y-1.5 p-4 transition-colors hover:border-[var(--nwse-lure-amber)] sm:p-5 lg:flex lg:items-start lg:gap-4"
              >
                <span className="nwse-icon col-start-1 row-start-1 h-9 w-9 shrink-0 lg:h-10 lg:w-10">
                  <ServiceIcon icon={item.icon} size={18} />
                </span>
                <span className="contents lg:block lg:flex-1">
                  <span className="col-start-2 row-start-1 block font-semibold text-[var(--nw-current-navy)] max-lg:break-words">{item.navLabel}</span>
                  <span className="nwse-type-body-small col-span-3 block text-[var(--nw-slate)] lg:mt-1">{item.cardSummary}</span>
                </span>
                <NwseIcon
                  name="arrow-up-right"
                  size={16}
                  className="col-start-3 row-start-1 shrink-0 justify-self-end text-[var(--nw-slate)] transition-colors group-hover:text-[var(--nwse-lure-amber-deep)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      <CtaBand
        heading={service.ctaHeading ?? 'Start with the audit'}
        body="Before we recommend anything, we run Croissance on the business and its rivals, so the first conversation starts from data rather than a pitch."
      />
    </DivisionLayout>
  );
}
