import { Link } from 'react-router-dom';
import { GROUNDSWELL_BRAND } from '../../../groundswell/brand';
import { GROUNDSWELL_PATH } from '../../../groundswell/site';
import { PHASE_INFO } from '../../../lib/groundswellValidation';
import { NwseIcon } from '../icons/NwseIcon';
import { DIVISION_GROUNDSWELL_PATH } from '../site';
import type { DivisionServiceContent } from '../types';
import { Tabs } from './Tabs';

/** Public explanations of the existing private engine. No runs or account reads originate here. */
const STAGES = [
  {
    id: 'audit', icon: 'method-discover', heading: 'Find the opportunities worth a closer look.',
    source: 'Start with public information', inputs: ['Your website and listings', 'Social activity and search demand', 'The businesses you compete with'],
    detail: 'GroundSwell brings the evidence into one audit, names its sources, and models the cost and possible return of the changes.',
    outputs: ['A one-page summary', 'A presentation for the conversation', 'The full audit and ranked changes'],
    note: 'No client account access is needed for the public research.',
  },
  {
    id: 'competitors', icon: 'method-prioritize', heading: 'Turn the research into a working plan.',
    source: 'Build on the growth audit', inputs: ['The audit’s findings', 'Competitor positioning and ads', 'Demand, costs, and published benchmarks'],
    detail: 'The engine compares competitors, prioritizes website and advertising changes, and builds ad sets around the opportunities in the audit.',
    outputs: ['Competitor comparisons', 'Website and advertising priorities', 'Ad sets with budgets and forecasts'],
    note: 'The team reviews the plan before work or campaign changes begin.',
  },
  {
    id: 'integrated', icon: 'pillar-integrations', heading: 'Read the plan against your own results.',
    source: 'For clients with linked accounts', inputs: ['The earlier audit and plan', 'Authorized analytics and search data', 'Connected advertising and social accounts'],
    detail: 'Once the client’s accounts are linked, GroundSwell reads the available figures and revisits the plan using the business’s own results.',
    outputs: ['A plan informed by account data', 'Revised costs and forecasts', 'Reports in the partner workspace'],
    note: 'Client account data is read only after the accounts are connected.',
  },
] as const;

const SERVICE_CONTEXT: Record<string, { evidence: string; application: string }> = {
  'social-media': { evidence: 'Audience, content, and competitor research', application: 'The team uses that evidence to shape the content plan and the next creative tests.' },
  'brand-development': { evidence: 'Public touchpoints and competitor positioning', application: 'The team uses the findings to make the positioning, messaging, and identity work fit the market.' },
  'website-design': { evidence: 'Website, search, and conversion findings', application: 'The audit gives the team a practical brief for the pages, search fixes, and customer paths to work on.' },
  marketing: { evidence: 'Search demand, advertising, and budget scenarios', application: 'The team reviews the ad plan, prepares the campaigns, and measures what the spend brings back.' },
  integration: { evidence: 'Public touchpoints, then authorized account data', application: 'The team connects tracking, booking, and customer tools so the work can be measured end to end.' },
  'digital-oversight': { evidence: 'Audit findings and connected account results', application: 'The team uses the reports to review priorities, question the numbers, and decide what needs attention next.' },
};

export function GroundswellEngine({ service }: { service?: DivisionServiceContent }) {
  const context = service ? SERVICE_CONTEXT[service.slug] : null;
  return (
    <section className="gs-engine nwse-dark" id="groundswell-engine" aria-labelledby="gs-engine-heading" data-role="groundswell-engine">
      <div className="gs-engine-inner">
        <div className="gs-engine-intro">
          <div>
            <p className="gs-engine-kicker">The engine behind the work</p>
            <h2 id="gs-engine-heading">{service ? `${service.navLabel}, informed by GroundSwell.` : 'One engine. A clearer next move.'}</h2>
          </div>
          <Link to={DIVISION_GROUNDSWELL_PATH} className="gs-engine-brand" aria-label="Explore the GroundSwell engine">
            <img src={GROUNDSWELL_BRAND.logoReverse} width={240} height={48} alt="GroundSwell" />
            <span>By New Wave <NwseIcon name="arrow-up-right" size={15} /></span>
          </Link>
        </div>
        <p className="gs-engine-summary">{context
          ? `${context.evidence}. ${context.application}`
          : 'Our services start with the same evidence. GroundSwell researches the business, builds the plan, and keeps the findings together in the partner workspace. Our team turns that plan into the work.'}</p>
        <Tabs
          label="GroundSwell engine phases"
          look="dark"
          className="gs-engine-tabs"
          items={STAGES.map(stage => ({
            id: stage.id,
            title: PHASE_INFO[stage.id].title,
            label: <><NwseIcon name={stage.icon} size={23} /><span>{PHASE_INFO[stage.id].title}</span></>,
            panel: (
              <div className="gs-engine-flow">
                <div className="gs-engine-inputs">
                  <p className="gs-engine-label">{stage.source}</p>
                  <ul>{stage.inputs.map(input => <li key={input}>{input}</li>)}</ul>
                </div>
                <div className="gs-engine-decision">
                  <span className="gs-engine-seal" aria-hidden="true"><NwseIcon name={stage.icon} size={40} /></span>
                  <h3>{stage.heading}</h3>
                  <p>{stage.detail}</p>
                </div>
                <div className="gs-engine-outputs">
                  <p className="gs-engine-label">What comes out</p>
                  <ul>{stage.outputs.map(output => <li key={output}><NwseIcon name="check" size={16} />{output}</li>)}</ul>
                </div>
                <p className="gs-engine-note">{stage.note}</p>
              </div>
            ),
          }))}
        />
        <div className="gs-engine-handoff">
          <Link to={`${DIVISION_GROUNDSWELL_PATH}#sample`}>See a real audit <NwseIcon name="arrow-right" size={17} /></Link>
          <Link to={GROUNDSWELL_PATH}>Open the partner workspace <NwseIcon name="arrow-up-right" size={17} /></Link>
        </div>
      </div>
    </section>
  );
}

/** A branded, illustrative signal path for the hero; its meaning is in the page copy and engine section. */
export function GroundswellSignal({ page }: { page: string }) {
  const context = SERVICE_CONTEXT[page];
  return (
    <div className="gs-signal" data-role="groundswell-signal" data-scene-state="static">
      <div className="gs-signal-source"><span className="gs-signal-dot" />{context?.evidence ?? 'Your business. Your market. Your next move.'}</div>
      <div className="gs-signal-current" aria-hidden="true" />
      <div className="gs-signal-identity">
        <img src={GROUNDSWELL_BRAND.logoReverse} width={260} height={52} alt="" />
        <span>The growth engine by New Wave</span>
      </div>
      <div className="gs-signal-stages">
        <span><NwseIcon name="method-discover" size={26} />Research</span>
        <span><NwseIcon name="method-prioritize" size={26} />Plan</span>
        <span><NwseIcon name="service-oversight" size={26} />Review</span>
      </div>
      <div className="gs-signal-destination"><NwseIcon name="arrow-right" size={17} />A plan your team can act on</div>
    </div>
  );
}
