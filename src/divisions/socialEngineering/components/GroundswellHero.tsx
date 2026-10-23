import { Link } from 'react-router-dom';
import { NwseIcon } from '../icons/NwseIcon';
import { GROUNDSWELL_BRAND } from '../../../groundswell/brand';
import { GROUNDSWELL_PATH } from '../../../groundswell/site';
import { auditContent } from '../content';
import { DIVISION_BASE_PATH, DIVISION_CONTACT_PATH } from '../site';

/** An honest preview of the three phases; it carries no simulated live results. */
export function GroundswellHero() {
  const content = auditContent;
  return (
    <section className="gs-marketing-hero" aria-labelledby="groundswell-heading">
      <div className="gs-marketing-hero-inner">
        <div className="gs-marketing-hero-copy">
          <nav aria-label="Breadcrumb" className="gs-marketing-breadcrumb">
            <Link to="/">New Wave IT</Link>
            <span aria-hidden="true">/</span>
            <Link to={DIVISION_BASE_PATH}>Services</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{content.navLabel}</span>
          </nav>
          <p className="gs-marketing-eyebrow">{content.kicker}</p>
          <h1 id="groundswell-heading">{content.headline}</h1>
          <p className="gs-marketing-summary">{content.summary}</p>
          <div className="gs-marketing-actions">
            <Link to={DIVISION_CONTACT_PATH} className="gs-marketing-button">
              Book a discovery call <NwseIcon name="arrow-up-right" size={17} aria-hidden="true" />
            </Link>
            <Link to={GROUNDSWELL_PATH} className="gs-marketing-button gs-marketing-button-outline">
              Partner sign-in <NwseIcon name="arrow-right" size={17} aria-hidden="true" />
            </Link>
          </div>
          <a href="#sample" className="gs-marketing-sample-link">
            {content.secondaryCta} <NwseIcon name="arrow-right" size={15} />
          </a>
          <ul className="gs-marketing-facts" data-role="hero-facts">
            {content.facts.map((fact) => (
              <li key={fact}>
                <NwseIcon name="check" size={14} aria-hidden="true" />
                {fact}
              </li>
            ))}
          </ul>
        </div>
        <aside className="gs-marketing-preview" aria-label="GroundSwell workflow preview">
          <div className="gs-marketing-preview-heading">
            <img src={GROUNDSWELL_BRAND.mark} width={56} height={56} alt="" />
            <span>
              One engine.
              <br />
              <strong>Every next move.</strong>
            </span>
          </div>
          <p className="gs-marketing-eyebrow">The workspace, from start to finish</p>
          <ol>
            {([
              ['Growth audit', 'Public research', 'Understand the business, its audience, and the opportunities in reach.', 'method-discover'],
              ['Competitor plan', 'Turn research into a plan', 'Compare the market, prioritize changes, and build the ad plan.', 'method-prioritize'],
              ['Integrated plan', 'Bring in client accounts', 'Read the plan against the client’s own traffic, ads, and social figures.', 'method-build'],
            ] as const).map(([title, source, detail, icon]) => (
              <li key={title}>
                <span className="gs-marketing-phase-marker" aria-hidden="true"><NwseIcon name={icon} size={18} /></span>
                <div>
                  <h2>{title}</h2>
                  <p>{source}</p>
                  <span>{detail}</span>
                </div>
              </li>
            ))}
          </ol>
          <Link to={GROUNDSWELL_PATH}>
            Open the partner workspace <NwseIcon name="arrow-up-right" size={16} aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </section>
  );
}
