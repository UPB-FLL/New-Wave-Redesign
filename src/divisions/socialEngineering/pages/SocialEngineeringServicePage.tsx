import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DivisionLayout } from '../components/DivisionLayout';
import { ServiceIcon } from '../components/ServiceIcon';
import {
  Band,
  CheckList,
  CtaBand,
  DivisionHero,
  FaqList,
  MetricLabels,
  PointGrid,
  PrimaryCta,
  SectionIntro,
  StepList,
} from '../components/sections';
import { divisionServices, findDivisionService } from '../content';
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

function ServicePageBody({ service }: { service: DivisionServiceContent }) {
  const seo = servicePageSeo(service);
  useDivisionMeta(seo);
  const related = divisionServices.filter((candidate) => candidate.slug !== service.slug);

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
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

      <Band tone="white" labelledBy="nwse-scope">
        <SectionIntro kicker="Scope" title={service.scopeHeading ?? 'What we test'} id="nwse-scope" />
        <PointGrid points={service.whatWeTest} />
      </Band>

      <Band labelledBy="nwse-steps">
        <SectionIntro kicker="How it works" title="How an engagement runs" id="nwse-steps" />
        <StepList steps={service.howItWorks} />
      </Band>

      <Band tone="white" labelledBy="nwse-deliverables">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionIntro kicker="Deliverables" title="What you receive" id="nwse-deliverables" />
            <CheckList items={service.deliverables} />
          </div>
          <div>
            <SectionIntro kicker="Reporting" title="What we measure" />
            <div className="mt-6">
              <MetricLabels labels={service.metrics} />
            </div>
          </div>
        </div>
      </Band>

      <Band id="faq" labelledBy="nwse-faq">
        <SectionIntro kicker="FAQ" title="Common questions" id="nwse-faq" />
        <FaqList faqs={service.faqs} />
      </Band>

      <Band tone="white" labelledBy="nwse-related">
        <SectionIntro kicker="Related services" title="Pair it with" id="nwse-related" />
        <ul className="mt-8 grid gap-4 md:grid-cols-3">
          {related.map((item) => (
            <li key={item.slug}>
              <Link
                to={divisionServicePath(item.slug)}
                className="nwse-card group flex h-full items-start gap-4 p-5 transition-colors hover:border-[var(--nwse-lure-amber)]"
              >
                <span className="nwse-icon h-10 w-10 shrink-0">
                  <ServiceIcon icon={item.icon} size={18} />
                </span>
                <span className="flex-1">
                  <span className="block font-semibold text-[var(--nw-current-navy)]">{item.navLabel}</span>
                  <span className="mt-1 block text-sm leading-relaxed text-[var(--nw-slate)]">{item.cardSummary}</span>
                </span>
                <ArrowUpRight
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-[var(--nw-slate)] transition-colors group-hover:text-[var(--nwse-lure-amber-deep)]"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      <CtaBand
        heading={service.ctaHeading ?? 'Find out where the hook lands'}
        body={`Start with a scoped ${service.navLabel.toLowerCase()} engagement and a baseline your leadership can act on.`}
      />
    </DivisionLayout>
  );
}
