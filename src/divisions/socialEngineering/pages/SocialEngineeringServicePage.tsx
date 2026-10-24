import { Link } from 'react-router-dom';
import { DivisionLayout } from '../components/DivisionLayout';
import { PILLAR_STYLE } from '../components/pillarStyle';
import { ServiceIcon } from '../components/ServiceIcon';
import { GroundswellEngine } from '../components/GroundswellEngine';
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
 * Every service page reads the same way, and no two neighbouring sections
 * share a box treatment: the hero; the facts at a glance on a navy strip;
 * the outcomes as tinted panels; what is included as soft tiles; the steps as
 * a stepper; what you receive in a navy panel beside what we report on; where
 * the service sits in the system as tinted pillar cards; the questions as a
 * hairline list; the related services as cards; the call to discovery.
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

      <Band tone="navy" size="compact" labelledBy="nwse-glance">
        <h2 id="nwse-glance" className="sr-only">
          At a glance
        </h2>
        <GlanceStrip items={service.glance} labelledBy="nwse-glance" tone="dark" />
      </Band>

      <GroundswellEngine service={service} />

      <Band tone="white" labelledBy="nwse-outcomes">
        <SectionIntro kicker="Outcomes" title="What changes for the business" id="nwse-outcomes" />
        <OutcomeList outcomes={service.outcomes} />
      </Band>

      <Band labelledBy="nwse-scope">
        <SectionIntro kicker="Scope" title={service.scopeHeading ?? 'What’s included'} id="nwse-scope" />
        <PointGrid points={service.scope} variant="soft" />
      </Band>

      <Band tone="white" labelledBy="nwse-steps">
        <SectionIntro
          kicker="How it works"
          title="How the work runs"
          description="GroundSwell provides the research and plan. The team reviews the priorities, carries out the work, and reports on the results."
          id="nwse-steps"
        />
        <StepList steps={service.process} />
      </Band>

      <Band labelledBy="nwse-deliverables">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 md:grid-cols-2 md:items-start">
          <div className="rounded-2xl p-5 sm:p-7 lg:p-8" style={{ background: 'var(--nw-current-navy)' }}>
            <SectionIntro tone="dark" kicker="Deliverables" title="What you receive" id="nwse-deliverables" />
            <CheckList items={service.deliverables} tone="dark" />
          </div>
          <div className="md:pt-2">
            <SectionIntro kicker="Reporting" title="What we report on" />
            <div className="mt-4 sm:mt-6">
              <MetricLabels labels={service.metrics} />
            </div>
          </div>
        </div>
      </Band>

      <Band tone="white" labelledBy="nwse-system">
        <SectionIntro
          kicker="Where it fits"
          title="One of six services in one growth system"
          description="Every service uses GroundSwell’s findings alongside the team’s work on tracking, connected tools, and advertising. Reports stay together in the partner workspace."
          id="nwse-system"
        />
        <PillarStrip pillars={hubContent.pillars} active={service.pillar} />
      </Band>

      <Band id="faq" labelledBy="nwse-faq">
        <SectionIntro kicker="FAQ" title="Common questions" id="nwse-faq" />
        <FaqList faqs={service.faqs} />
      </Band>

      <Band tone="white" labelledBy="nwse-related">
        <SectionIntro kicker="Related services" title="Works best alongside" id="nwse-related" />
        {/* The other services as a ledger: one row each under a hairline, the
            icon in its pillar's colour, the whole row the link. */}
        <ol className="nwse-ledger mt-6 grid grid-cols-1 sm:mt-8 lg:mt-10 lg:grid-cols-2 lg:gap-x-12" data-role="service-ledger">
          {related.map((item) => {
            const color = PILLAR_STYLE[item.pillar];
            return (
              <li key={item.slug}>
                <Link
                  to={divisionServicePath(item.slug)}
                  className="group grid grid-cols-[2rem_minmax(0,1fr)_1.5rem] items-start gap-x-4 gap-y-1.5 py-5 sm:py-6"
                >
                  <span className="col-start-1 row-start-1 mt-0.5" style={{ color: color.deep }} aria-hidden="true">
                    <ServiceIcon icon={item.icon} size={22} />
                  </span>
                  <span className="nwse-type-title-2 col-start-2 row-start-1 block text-[var(--nw-current-navy)] transition-colors group-hover:text-[var(--nwse-lure-amber-deep)] max-lg:break-words">
                    {item.navLabel}
                  </span>
                  <NwseIcon name="arrow-up-right" size={18} className="nwse-ledger-arrow col-start-3 row-start-1 mt-0.5 justify-self-end text-[var(--nw-slate)]" />
                  <span className="nwse-type-body-small col-start-2 row-start-2 block text-[var(--nw-slate)]">{item.cardSummary}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </Band>

      <CtaBand
        heading={service.ctaHeading ?? 'Start with the audit'}
        body="Before we recommend anything, we run GroundSwell on the business and its rivals, so the first conversation starts from data rather than a pitch."
      />
    </DivisionLayout>
  );
}
