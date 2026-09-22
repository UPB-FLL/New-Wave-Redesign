import { Link } from 'react-router-dom';
import Contact from '../../../components/Contact';
import { useDivisionContactDetails } from '../contactDetails';
import { DivisionLayout } from '../components/DivisionLayout';
import { divisionContactIcons } from '../components/contactIcons';
import { DivisionHero } from '../components/sections';
import { contactUsContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { contactUsPageSeo } from '../seo';
import { DIVISION_CONTACT_PATH, DIVISION_PRIMARY_CTA } from '../site';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = contactUsPageSeo();

/**
 * General inquiries: current clients, questions, partnerships, and anything
 * that isn't a new project. New projects go to the discovery-call page, which
 * the hero points to at every width.
 */
export default function SocialEngineeringContactUsPage() {
  useDivisionMeta(seo);
  // The footer's CMS values; no placeholder phone number (see contactDetails.ts).
  const details = useDivisionContactDetails();
  const content = contactUsContent;

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        kicker={content.kicker}
        headline={content.headline}
        summary={content.summary}
        actions={
          <p className="nwse-type-body flex flex-wrap items-center gap-x-2 text-[var(--nw-mist-gray)]">
            {content.newProjectPrompt}
            <Link
              to={DIVISION_CONTACT_PATH}
              className="inline-flex items-center gap-1.5 font-semibold text-[var(--nwse-lure-amber)] underline-offset-4 transition-colors hover:text-[var(--nw-cloud-white)] hover:underline max-sm:min-h-11"
            >
              {DIVISION_PRIMARY_CTA}
              <NwseIcon name="arrow-right" size={16} className="shrink-0" />
            </Link>
          </p>
        }
      />
      <Contact
        inquiry="social-engineering"
        icons={divisionContactIcons}
        details={details}
        intro={content.form}
      />
    </DivisionLayout>
  );
}
