import type { PricingUnit } from '../../lib/pricingUnits';
import { publishedRateFor, ratesDiffer, ratesSentence, usd } from '../../lib/publishedRates';
import { Section } from '../brand/Section';
import { SectionHeading } from '../brand/SectionHeading';

/** The question buyers ask, as the section's title. */
export const RATES_QUESTION = 'How much do managed IT services cost?';

/** Follows the rates sentence. True at any size: it promises a quote from the rates, never a total. */
export const RATES_NOTE =
  'Each figure is a monthly rate for one unit, not a total. A written quote is built from these rates and the number of computers, accounts, servers, and locations you have.';

const TH_CLASS = 'border-b border-[var(--nw-slate)] px-3 py-3 text-left align-top text-sm font-semibold text-[var(--nw-current-navy)]';
const TD_CLASS = 'border-b border-[var(--nw-mist-gray)] px-3 py-3 align-top';

/** What a row covers: the admin's description, or what one unit is when the row has none. */
function covers(unit: PricingUnit): string {
  if (unit.description) return unit.description;
  const rate = publishedRateFor(unit.name);
  return rate ? `Cost per ${rate.per}` : '';
}

/**
 * The published price list as plain HTML: the question, a one-paragraph
 * answer, and a table of every active unit. It needs no JavaScript, so the
 * build-time render of /pricing carries the prices. The table is always the
 * rows it is given. The answer states the rates in prose from PUBLISHED_RATES,
 * so it shows only while that constant agrees with the rows; a price changed
 * in the admin leaves the table alone until the constant follows. Renders
 * nothing without rows.
 */
export function PublishedRates({ units }: { units: readonly PricingUnit[] }) {
  if (!units.length) return null;
  const agrees = ratesDiffer(units).length === 0;

  return (
    <Section>
      <SectionHeading title={RATES_QUESTION} description={agrees ? `${ratesSentence()} ${RATES_NOTE}` : undefined} />
      <div className="mt-8 max-w-3xl overflow-x-auto">
        <table className="w-full border-collapse text-base leading-relaxed text-[var(--nw-slate)]">
          <caption className="mb-3 text-left text-sm text-[var(--nw-slate)]">
            New Wave IT monthly rates in US dollars. Each price is for one unit, per month.
          </caption>
          <thead>
            <tr>
              <th scope="col" className={TH_CLASS}>Item</th>
              <th scope="col" className={TH_CLASS}>What it covers</th>
              <th scope="col" className={`${TH_CLASS} text-right`}>Price per month</th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => (
              <tr key={unit.id}>
                <th scope="row" className={`${TD_CLASS} text-left font-semibold text-[var(--nw-current-navy)]`}>{unit.name}</th>
                <td className={TD_CLASS}>{covers(unit)}</td>
                <td className={`${TD_CLASS} whitespace-nowrap text-right font-semibold text-[var(--nw-current-navy)]`}>{usd(unit.cost_per_unit / 100)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
