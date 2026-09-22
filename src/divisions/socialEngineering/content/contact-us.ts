// The Contact us page (/social-engineering/contact-us). Pure data.
//
// A separate page from the discovery call (/social-engineering/contact): this
// one is for current clients, general questions, partnerships, and anything
// that isn't a new project, and it points new projects to the discovery call.
// Its title, description, keywords, kicker, H1, and form copy must stay
// distinct from contactContent so the two pages never compete.

export const contactUsContent = {
  metaTitle: 'Contact us | New Wave: Social Engineering',
  metaDescription:
    'Client requests, general questions, and partnership ideas for New Wave: Social Engineering, the Fort Lauderdale social media and marketing agency.',
  keywords: 'contact us, client requests, general questions, marketing partnerships fort lauderdale, new wave it',
  navLabel: 'Contact us',
  kicker: 'Clients, questions & partnerships',
  headline: 'Contact us',
  summary:
    'Reach New Wave: Social Engineering here with client requests, general questions, partnership ideas, and anything else that isn’t a new project.',
  /** Followed by a DIVISION_PRIMARY_CTA link to the discovery-call page. */
  newProjectPrompt: 'Starting a new project?',
  form: {
    label: 'General inquiries',
    headline: 'Send us a note',
    subheadline: 'Questions about work in progress, partnership ideas, or anything else. We’ll reply within one business day.',
    messagePlaceholder:
      'Your question or request, and whether it’s about current work, a partnership, or something else...',
    phoneNote: 'Questions, client requests, and partnerships',
    /** The shared form's phone field is optional; its default placeholder is a sample number. */
    phonePlaceholder: 'Optional',
    successBody: 'Thanks for getting in touch. We’ll reply within one business day.',
  },
} as const;
