import { ArrowRight, CheckCircle2, type LucideIcon } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Footer from '../Footer';
import Navbar from '../Navbar';
import { PublicPageHero } from './PublicPageHero';
import { SectionHeading } from './SectionHeading';

export type ServicePageCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  items?: string[];
};

export type ServicePageSection = {
  title: string;
  description?: string;
  cards?: ServicePageCard[];
  items?: string[];
  callout?: string;
};

export type ServiceCategoryPageData = {
  icon: LucideIcon;
  name: string;
  description: string;
  details: string;
  highlights: string[];
  seoLink: string;
  heroTitle?: string;
  heroDescription?: string;
  eyebrow?: string;
  assessmentLabel?: string;
  guideLabel?: string;
  featureTitle?: string;
  featureDescription?: string;
  featureCards?: ServicePageCard[];
  sections?: ServicePageSection[];
  ctaTitle?: string;
  ctaDescription?: string;
  ctaLabel?: string;
};

function DetailCard({ card }: { card: ServicePageCard }) {
  const Icon = card.icon;
  return (
    <article className="rounded-lg border p-5" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}>
      <span className="nw-icon-signal h-10 w-10"><Icon size={19} aria-hidden="true" /></span>
      <h3 className="mt-5 text-lg font-bold text-[var(--nw-current-navy)]">{card.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--nw-slate)]">{card.description}</p>
      {card.items?.length ? (
        <ul className="mt-5 space-y-2 border-t pt-4 text-sm text-[var(--nw-current-navy)]" style={{ borderColor: 'var(--nw-mist-gray)' }}>
          {card.items.map((item) => <li key={item} className="flex items-start gap-2"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[var(--nw-continuity-green)]" aria-hidden="true" />{item}</li>)}
        </ul>
      ) : null}
    </article>
  );
}

export function ServiceCategoryPage({ data }: { data: ServiceCategoryPageData }) {
  const navigate = useNavigate();
  const title = data.heroTitle || data.name;
  const description = data.heroDescription || data.description;

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PublicPageHero
        icon={data.icon}
        eyebrow={data.eyebrow || 'Service Category'}
        title={title}
        description={description}
        backTo="/services"
        backLabel="All services"
      >
        <button type="button" onClick={() => navigate('/contact')} className="btn-primary">
          {data.assessmentLabel || 'Schedule a Consultation'}
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        <Link to={data.seoLink} className="btn-secondary">{data.guideLabel || 'Read the Complete Guide'}<ArrowRight size={17} aria-hidden="true" /></Link>
      </PublicPageHero>

      <main>
        <section className="bg-[var(--nw-pure-white)] py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:px-8">
            <div>
              <SectionHeading eyebrow={data.name} title="Technology designed around your operation." />
              <p className="mt-6 text-base leading-relaxed text-[var(--nw-slate)] sm:text-lg">{data.details}</p>
            </div>
            <aside className="rounded-lg border p-6" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
              <h2 className="text-lg font-bold text-[var(--nw-current-navy)]">Service highlights</h2>
              <ul className="mt-5 space-y-3">
                {data.highlights.map((highlight) => <li key={highlight} className="flex items-start gap-3 text-sm leading-relaxed text-[var(--nw-current-navy)]"><CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--nw-continuity-green)]" aria-hidden="true" />{highlight}</li>)}
              </ul>
            </aside>
          </div>
        </section>

        {data.featureCards?.length ? (
          <section className="bg-[var(--nw-cloud-white)] py-16 sm:py-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHeading title={data.featureTitle || `${data.name} capabilities`} description={data.featureDescription} />
              <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{data.featureCards.map((card) => <DetailCard key={card.title} card={card} />)}</div>
            </div>
          </section>
        ) : null}

        {data.sections?.map((section, index) => (
          <section key={section.title} className={index % 2 ? 'bg-[var(--nw-pure-white)] py-16 sm:py-20' : 'bg-[var(--nw-cloud-white)] py-16 sm:py-20'}>
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <SectionHeading title={section.title} description={section.description} />
              {section.cards?.length ? <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">{section.cards.map((card) => <DetailCard key={card.title} card={card} />)}</div> : null}
              {section.items?.length ? <ul className="mt-8 grid gap-3 md:grid-cols-2">{section.items.map((item) => <li key={item} className="rounded-md border p-4 text-sm leading-relaxed text-[var(--nw-current-navy)]" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}><CheckCircle2 size={17} className="mr-2 inline-block align-text-bottom text-[var(--nw-continuity-green)]" aria-hidden="true" />{item}</li>)}</ul> : null}
              {section.callout ? <aside className="mt-10 rounded-lg border-l-4 p-6 text-base leading-relaxed text-[var(--nw-mist-gray)]" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-signal-cyan)' }}>{section.callout}</aside> : null}
            </div>
          </section>
        ))}

        <section className="py-16 sm:py-20" style={{ background: 'var(--nw-deep-current)' }}>
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <p className="nw-kicker text-[var(--nw-signal-cyan)]">New Wave IT</p>
            <h2 className="nw-display mt-3 text-3xl leading-[1.1] text-[var(--nw-cloud-white)] sm:text-4xl">{data.ctaTitle || `Ready to plan your ${data.name.toLowerCase()}?`}</h2>
            <p className="mt-4 text-base leading-relaxed text-[var(--nw-mist-gray)] sm:text-lg">{data.ctaDescription || `Talk with our team about a practical ${data.name.toLowerCase()} plan that supports your next business objective.`}</p>
            <button type="button" onClick={() => navigate('/contact')} className="btn-primary mt-8">{data.ctaLabel || 'Get Started'}<ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
