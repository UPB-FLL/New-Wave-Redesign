import { useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import DynamicPricingBuilder from '../components/DynamicPricingBuilder';
import { FaqSection } from '../components/brand/FaqSection';
import { PageHeader } from '../components/brand/PageHeader';
import { PublishedRates } from '../components/pricing/PublishedRates';
import { useContent } from '../lib/useContent';
import { priceListJsonLd } from '../lib/pricingSchema';
import { usePricingUnits } from '../lib/pricingUnits';
import { PUBLISHED_RATES, ratesDiffer, usd, type RateKey } from '../lib/publishedRates';
import { IT_PAGE_META } from '../lib/routeMeta';
import { faqPageNode, type FaqItem } from '../lib/structuredData';
import { usePageMeta } from '../lib/usePageMeta';

const PHONE = '(561) 564-1846';
const EMAIL = 'support@newwaveitfl.com';

/** "$105 per computer or device": one published rate with its unit. */
const rate = (key: RateKey) => `${usd(PUBLISHED_RATES[key].dollars)} per ${PUBLISHED_RATES[key].per}`;

// The questions whose answers state a rate. Their figures come from
// PUBLISHED_RATES, as the answer paragraph above the table does
// (PublishedRates), so they follow its rule: shown only while the price list
// is on the page and agrees with the constant.
const RATE_FAQS: FaqItem[] = [
  {
    question: 'How much does New Wave IT charge per computer, per user and per server?',
    answer:
      `New Wave IT, a managed IT services provider in Fort Lauderdale, prices managed IT at ${rate('computer')}, ${rate('user')} and ${rate('server')}, each per month. ` +
      `Network monitoring is ${rate('location')}, per month. These are rates for one unit each, not totals.`,
  },
  {
    question: 'Does New Wave IT price per user or per device?',
    answer:
      `Both. New Wave IT prices by device and by user: ${rate('computer')} and ${rate('user')}, each per month. ` +
      'Per-device pricing counts the computers and devices under management, and per-user pricing counts the people or accounts that use them. ' +
      'A written quote from New Wave IT is built from both counts, along with the number of managed servers and locations.',
  },
  {
    question: "Is Microsoft 365 licensing on New Wave IT's price list?",
    answer:
      "Yes. Microsoft 365 licensing is on New Wave IT's published price list as two Office 365 lines, each with a monthly rate: " +
      `${rate('microsoft365License')} for licensing only, and ${rate('microsoft365LicenseWithEmail')} for licensing and email. ` +
      'Both are lines of their own on the price list, beside the rates per computer, user account, server and location.',
  },
];

// The questions that state no figure, so they hold whatever the price list says.
const QUOTE_FAQS: FaqItem[] = [
  {
    question: "Are New Wave IT's rates the same for every business?",
    answer:
      "New Wave IT's published rates are per unit, per month, and each written quote is built from them. " +
      'The monthly amount on a quote depends on how many computers or devices, employees or user accounts, managed servers and locations a business has.',
  },
  {
    question: 'What does a quote from New Wave IT look like?',
    answer:
      'A quote from New Wave IT is a written document that states a flat monthly price. ' +
      'It is built from the published per-unit rates and the number of each unit a business has, and it is prepared after a free IT assessment. ' +
      'The monthly figure is known before onboarding starts.',
  },
  {
    question: 'Does New Wave IT require a long-term contract?',
    answer:
      'No. New Wave IT does not require a long-term contract. ' +
      'Its pricing is flat and monthly, built from published rates per computer or device, employee or user account, managed server and location. ' +
      'The free IT assessment is the time to ask about terms, before a quote is accepted.',
  },
  {
    question: 'How do I get a quote from New Wave IT?',
    answer:
      `Request a quote with a form on New Wave IT's pricing page, by phone at ${PHONE} or by email at ${EMAIL}. ` +
      'New Wave IT starts with a free IT assessment and then writes a quote built from the published rates. ' +
      'Its Fort Lauderdale office is open Monday to Friday, 8am to 6pm, and serves businesses in Broward, Miami-Dade and Palm Beach counties.',
  },
];

const ALL_FAQS: FaqItem[] = [...RATE_FAQS, ...QUOTE_FAQS];

export default function PricingPage() {
  // The build seeds the price list, so the static HTML carries the table and
  // its Offer nodes; the browser reads the same rows from Supabase.
  const { units } = usePricingUnits();
  // A rate in a sentence must be the rate in the table: without the price
  // list, or with a price the constant has not followed, the rate questions go.
  const faqs = useMemo(() => (units.length > 0 && ratesDiffer(units).length === 0 ? ALL_FAQS : QUOTE_FAQS), [units]);
  // Memoised: usePageMeta rewrites the JSON-LD block whenever the object changes.
  // The FAQPage is the questions shown; the offers come first when there is a price list.
  const jsonLd = useMemo(() => {
    const faqNode = faqPageNode(faqs);
    return units.length ? [priceListJsonLd(units), faqNode] : [faqNode];
  }, [units, faqs]);
  usePageMeta({ ...IT_PAGE_META['/pricing'], jsonLd });
  const c = useContent('pricing');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Home') {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // The CMS headline is "Simple, Scalable": it was written with "plans" as its accent.
  const title = `${c.headline || 'Simple, scalable'} ${c.headline_accent || 'plans'}`;

  return (
    <div className="min-h-screen bg-[var(--nw-cloud-white)]">
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/pricing'].breadcrumbs}
        title={title}
        description={c.subheadline || 'Select the services you need and get an instant estimate. Our team will follow up with a customized proposal.'}
      />
      <main>
        <PublishedRates units={units} />
        <section className="relative z-10 py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl">
              <DynamicPricingBuilder />
            </div>
          </div>
        </section>
        <FaqSection title="Pricing questions" items={faqs} />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
