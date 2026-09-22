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
          headline: 'Tell us what you want tested',
          subheadline:
            'Phishing, phone, onsite, or training — or not sure yet. We’ll reply within one business day with next steps.',
          messagePlaceholder:
            'Team size, locations, what you want tested (email, phone, onsite, training), and any compliance or insurance requirements...',
          phoneNote: 'Talk through scope with our team',
          successBody:
            'Thanks for reaching out. We’ll reply within one business day with next steps for scoping your assessment.',
        }}
      />
    </DivisionLayout>
  );
}
