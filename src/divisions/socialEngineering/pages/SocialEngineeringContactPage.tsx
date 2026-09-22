import Contact from '../../../components/Contact';
import { DivisionLayout } from '../components/DivisionLayout';
import { DivisionHero } from '../components/sections';
import { contactContent } from '../content';
import { contactPageSeo } from '../seo';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = contactPageSeo();

export default function SocialEngineeringContactPage() {
  useDivisionMeta(seo);

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        kicker={contactContent.kicker}
        headline={contactContent.headline}
        summary={contactContent.summary}
      />
      <Contact
        inquiry="social-engineering"
        intro={{
          label: 'New Wave: Social Engineering',
          headline: 'Tell us about the business',
          subheadline:
            'Social media, brand, website, marketing, or not sure yet. We’ll reply within one business day to set up a discovery call.',
          messagePlaceholder:
            'What the business does, where you want to be in 12 months, and what’s in place today (website, social accounts, booking or CRM tools)...',
          phoneNote: 'Talk through your goals with our team',
          successBody:
            'Thanks for reaching out. We’ll reply within one business day to set up your discovery call.',
        }}
      />
    </DivisionLayout>
  );
}
