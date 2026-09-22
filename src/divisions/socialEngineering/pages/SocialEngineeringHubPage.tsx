import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DivisionLayout } from '../components/DivisionLayout';
import { DivisionLogo } from '../components/DivisionLogo';
import { FamilyLockup } from '../components/FamilyLockup';
import { ServiceIcon } from '../components/ServiceIcon';
import {
  Band,
  CtaBand,
  DivisionHero,
  FaqList,
  MetricLabels,
  PointGrid,
  PrimaryCta,
  SectionIntro,
  StepList,
} from '../components/sections';
import { divisionServices, hubContent } from '../content';
import { hubPageSeo } from '../seo';
import { PARENT_NAME, divisionServicePath } from '../site';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = hubPageSeo();

export default function SocialEngineeringHubPage() {
  useDivisionMeta(seo);
  const content = hubContent;

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        kickerInHeading
        kicker={content.kicker}
        headline={content.headline}
        summary={content.summary}
        actions={
          <>
            <PrimaryCta />
            <a href="#services" className="nwse-btn nwse-btn-ghost-dark">
              Explore services
            </a>
          </>
        }
        footnote={
          <div className="flex flex-col gap-3">
            <p className="nwse-label" style={{ color: 'var(--nw-mist-gray)' }}>
              What we measure
            </p>
            <MetricLabels labels={content.metrics.map((metric) => metric.title)} onDark />
          </div>
        }
      />

      <Band tone="white" labelledBy="nwse-problem">
        <div className="grid items-center gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionIntro kicker="The hook" title={content.problem.heading} id="nwse-problem" />
            <div className="mt-6 flex max-w-3xl flex-col gap-4 text-base leading-relaxed text-[var(--nw-slate)]">
              {content.problem.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <DivisionLogo lockup="mark" ground="light" width={200} decorative className="h-auto w-40 sm:w-52" />
          </div>
        </div>
      </Band>

      <Band id="services" labelledBy="nwse-services">
        <SectionIntro
          kicker="Services"
          title="Four ways we test and train your people"
          id="nwse-services"
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {divisionServices.map((service) => (
            <li key={service.slug}>
              <Link
                to={divisionServicePath(service.slug)}
                className="nwse-card group flex h-full flex-col p-6 transition-colors hover:border-[var(--nwse-lure-amber)]"
              >
                <div className="flex items-start justify-between">
                  <span className="nwse-icon h-11 w-11">
                    <ServiceIcon icon={service.icon} size={20} />
                  </span>
                  <ArrowUpRight
                    size={18}
                    aria-hidden="true"
                    className="text-[var(--nw-slate)] transition-colors group-hover:text-[var(--nwse-lure-amber-deep)]"
                  />
                </div>
                <h3 className="mt-5 text-xl font-bold text-[var(--nw-current-navy)]">{service.navLabel}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--nw-slate)]">{service.cardSummary}</p>
                <span className="nwse-link mt-5 inline-flex items-center gap-1.5 text-sm">
                  Learn more <span className="sr-only">about {service.navLabel.toLowerCase()}</span>
                  <ArrowRight size={14} aria-hidden="true" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Band>

      <Band tone="white" labelledBy="nwse-approach">
        <SectionIntro kicker="Approach" title="Test, teach, measure" id="nwse-approach" />
        <PointGrid points={content.approach} />
      </Band>

      <Band id="process" labelledBy="nwse-process">
        <SectionIntro kicker="How an engagement runs" title="From signed authorization to a re-test" id="nwse-process" />
        <StepList steps={content.process} />
      </Band>

      <section
        aria-labelledby="nwse-metrics"
        className="nwse-dark py-16 sm:py-20"
        style={{ background: 'var(--nw-deep-current)' }}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="nwse-kicker nwse-kicker-on-dark">Reporting</p>
          <h2 id="nwse-metrics" className="nwse-display mt-3 max-w-3xl text-3xl leading-tight text-[var(--nw-cloud-white)] sm:text-4xl">
            Numbers that show behavior changing
          </h2>
          <dl className="mt-10 grid gap-x-8 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
            {content.metrics.map((metric) => (
              <div key={metric.title} className="border-t pt-5" style={{ borderColor: 'color-mix(in srgb, var(--nw-slate) 70%, transparent)' }}>
                <dt className="nwse-label" style={{ color: 'var(--nwse-lure-amber)' }}>
                  {metric.title}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-[var(--nw-mist-gray)]">{metric.detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <Band tone="white" labelledBy="nwse-industries">
        <SectionIntro kicker="Who we work with" title="Built for South Florida organizations" id="nwse-industries" />
        <PointGrid points={content.industries} columns={2} />
      </Band>

      <Band labelledBy="nwse-family">
        <div className="nwse-card grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_1.4fr] lg:items-center">
          <div className="flex justify-center lg:justify-start">
            <FamilyLockup ground="light" direction="column" labelled />
          </div>
          <div>
            <SectionIntro kicker="Part of New Wave IT" title={content.relationship.heading} id="nwse-family" />
            <div className="mt-5 flex flex-col gap-4 text-base leading-relaxed text-[var(--nw-slate)]">
              {content.relationship.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
            <Link to="/" className="nwse-link mt-6 inline-flex items-center gap-1.5 text-sm">
              Visit {PARENT_NAME}
              <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Band>

      <Band tone="white" id="faq" labelledBy="nwse-faq">
        <SectionIntro kicker="FAQ" title="Questions buyers ask first" id="nwse-faq" />
        <FaqList faqs={content.faqs} />
      </Band>

      <CtaBand heading={content.cta.heading} body={content.cta.body} />
    </DivisionLayout>
  );
}
