import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { HEADWAY_BRAND } from '../../../groundswell/headwayBrand';
import { DivisionLayout } from '../components/DivisionLayout';
import { PILLAR_STYLE, accentAt } from '../components/pillarStyle';
import { ServiceIcon } from '../components/ServiceIcon';
import { Band, CheckList, CtaBand, DivisionHero, FaqList, PrimaryCta, SectionIntro, StepList } from '../components/sections';
import { divisionServices, headwayContent, headwayServices, headwaySetupItems } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { headwayPageSeo } from '../seo';
import { DIVISION_GROUNDSWELL_PATH, divisionServicePath } from '../site';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = headwayPageSeo();

/**
 * Headway, the implementation service: what it is, the six services under
 * it (each a ledger row linking to its page, with what runs through the
 * linked accounts and what the team carries out), how it works, the setup
 * checklist in plain words, the ground rules, the questions, the call.
 */
export default function SocialEngineeringHeadwayPage() {
  useDivisionMeta(seo);
  const c = headwayContent;
  const kinds = ['link', 'id', 'access', 'secret'] as const;

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        kicker={c.kicker}
        headline={c.headline}
        summary={c.summary}
        facts={c.facts}
        actions={
          <>
            <PrimaryCta />
            <a href="#services" className="nwse-btn nwse-btn-ghost-dark">
              {c.secondaryCta}
            </a>
          </>
        }
      />

      <Band tone="white" labelledBy="nwse-headway-intro">
        <div className="grid items-start gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <SectionIntro kicker={c.intro.kicker} title={c.intro.heading} id="nwse-headway-intro" />
            <div className="nwse-type-body mt-4 flex max-w-3xl flex-col gap-4 text-[var(--nw-slate)] sm:mt-6">
              {c.intro.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
          {/* The family: GroundSwell plans, Headway carries out; both logos decorative, the words beside them say it. */}
          <figure className="rounded-2xl p-6 sm:p-8" style={{ background: 'var(--nw-current-navy)' }} data-role="headway-family">
            <img src={HEADWAY_BRAND.logoReverse} width={320} height={68} alt="" aria-hidden="true" />
            <figcaption className="nwse-type-body-small mt-5 flex flex-col gap-3 text-[var(--nw-mist-gray)]">
              <p>
                <span className="font-semibold text-[var(--nw-cloud-white)]">GroundSwell</span> researches the business and writes the plan from public data and the accounts you link.
              </p>
              <p>
                <span className="font-semibold text-[var(--nw-cloud-white)]">Headway</span> turns that plan into approved actions and carries them out, through your accounts and our team.
              </p>
              <Link to={DIVISION_GROUNDSWELL_PATH} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold transition-colors hover:text-[var(--nw-cloud-white)]" style={{ color: 'var(--nwse-lure-amber)' }}>
                About GroundSwell <NwseIcon name="arrow-right" size={14} />
              </Link>
            </figcaption>
          </figure>
        </div>
      </Band>

      <Band id="services" labelledBy="nwse-headway-services">
        <SectionIntro kicker={c.services.kicker} title={c.services.heading} description={c.services.intro} id="nwse-headway-services" />
        <ol className="nwse-ledger mt-6 flex flex-col sm:mt-8 lg:mt-10" data-role="headway-services">
          {headwayServices.map((service) => {
            const page = divisionServices.find((s) => s.slug === service.key)!;
            const color = PILLAR_STYLE[page.pillar];
            return (
              <li key={service.key} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 gap-y-3 py-6 sm:py-7 lg:grid-cols-[2.5rem_minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] lg:gap-x-8 lg:py-8" data-service={service.key}>
                <span className="col-start-1 row-start-1 mt-0.5" style={{ color: color.deep }} aria-hidden="true">
                  <ServiceIcon icon={page.icon} size={22} />
                </span>
                <div className="col-start-2 row-start-1">
                  <h3 className="nwse-type-title-1 text-[var(--nw-current-navy)]">{service.label}</h3>
                  <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{service.does}</p>
                  <Link to={divisionServicePath(service.key)} className="nwse-link mt-3 inline-flex items-center gap-1.5 text-sm font-semibold max-lg:min-h-11" aria-label={`${c.services.pageLink}: ${service.label}`}>
                    {c.services.pageLink} <NwseIcon name="arrow-right" size={14} />
                  </Link>
                </div>
                <div className="col-start-2 lg:col-start-3 lg:row-start-1">
                  <p className="nwse-type-label nwse-label">{c.services.automaticLabel}</p>
                  {service.automatic.length ? (
                    <ul className="nwse-type-body-small mt-1 flex flex-col gap-1 text-[var(--nw-current-navy)]" aria-label={`${service.label}: runs through the linked accounts`}>
                      {service.automatic.map((item) => (
                        <li key={item} className="flex items-baseline gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: color.accent }} aria-hidden="true" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="nwse-type-body-small mt-1 text-[var(--nw-slate)]">{c.services.noneLabel}</p>
                  )}
                </div>
                <div className="col-start-2 lg:col-start-4 lg:row-start-1">
                  <p className="nwse-type-label nwse-label">{c.services.teamLabel}</p>
                  <ul className="nwse-type-body-small mt-1 flex flex-col gap-1 text-[var(--nw-slate)]" aria-label={`${service.label}: the team carries out`}>
                    {service.team.map((item) => (
                      <li key={item} className="flex items-baseline gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: 'var(--nw-mist-gray)' }} aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </Band>

      <Band tone="white" id="how-it-works" labelledBy="nwse-headway-process">
        <SectionIntro kicker={c.process.kicker} title={c.process.heading} id="nwse-headway-process" />
        <StepList steps={c.process.steps} />
      </Band>

      <Band id="setup" labelledBy="nwse-headway-setup">
        <SectionIntro kicker={c.setup.kicker} title={c.setup.heading} description={c.setup.intro} id="nwse-headway-setup" />
        <div className="mt-6 grid gap-x-10 gap-y-8 sm:mt-8 md:grid-cols-2 lg:mt-10" data-role="headway-setup">
          {kinds.map((kind, index) => {
            const color = accentAt(index);
            const items = headwaySetupItems.filter((item) => item.kind === kind);
            return (
              <div key={kind} className="nwse-rule" style={{ '--nwse-rule': color.accent } as CSSProperties} data-kind={kind}>
                <h3 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{c.setup.kinds[kind].title}</h3>
                <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{c.setup.kinds[kind].detail}</p>
                <ul className="nwse-type-body-small mt-3 flex flex-col gap-1.5 text-[var(--nw-current-navy)]" aria-label={c.setup.kinds[kind].title}>
                  {items.map((item) => (
                    <li key={item.key} className="flex items-baseline gap-2">
                      <span className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: color.accent }} aria-hidden="true" />
                      <span>
                        {item.label}
                        {!item.required ? <span className="text-[var(--nw-slate)]"> · optional</span> : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Band>

      <Band tone="navy" labelledBy="nwse-headway-rules">
        <SectionIntro tone="dark" kicker={c.rules.kicker} title={c.rules.heading} id="nwse-headway-rules" />
        <CheckList items={c.rules.items} tone="dark" />
      </Band>

      <Band tone="white" id="questions" labelledBy="nwse-headway-faq">
        <SectionIntro kicker="FAQ" title="Questions about Headway" id="nwse-headway-faq" />
        <FaqList faqs={c.faqs} />
      </Band>

      <CtaBand heading={c.cta.heading} body={c.cta.body} />
    </DivisionLayout>
  );
}
