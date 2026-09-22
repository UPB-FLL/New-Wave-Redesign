import Contact from '../../../components/Contact';
import { DivisionLayout } from '../components/DivisionLayout';
import { DivisionHero } from '../components/sections';
import { contactContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { contactPageSeo } from '../seo';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = contactPageSeo();

// The shared IT form, drawn with the division's icon set at the form's own sizes.
const contactIcons = {
  phone: <NwseIcon name="phone" size={18} />,
  mail: <NwseIcon name="mail" size={18} />,
  mapPin: <NwseIcon name="map-pin" size={18} />,
  send: <NwseIcon name="send" size={18} />,
  success: <NwseIcon name="check-circle" size={32} />,
};

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
        icons={contactIcons}
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
