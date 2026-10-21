// The Croissance partner portal (/social-engineering/croissance/partners). Pure data.
//
// Partners are outside agencies and resellers. They submit businesses for a
// Croissance audit and get the three reports as Google Drive links; New Wave:
// Social Engineering starts each audit (the admin portal's Groundswell
// section). Accounts are by invitation only. Never promise turnaround times or
// results here.

export const partnersContent = {
  metaTitle: 'Croissance partner portal | New Wave: Social Engineering',
  metaDescription:
    'Sign in to the Croissance partner portal to submit businesses for a growth audit and download each one’s summary, slides, and full audit.',
  keywords: 'croissance partner portal, marketing audit partners, agency partners, growth audit reseller, new wave social engineering',
  navLabel: 'Partner portal',
  kicker: 'For agencies and resellers',
  headline: 'Croissance partner portal',
  summary:
    'Partners submit businesses for a Croissance audit and get its three reports, in each business’s own brand, as Google Drive links.',
  signIn: {
    heading: 'Partner sign-in',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    forgot: 'Forgot your password?',
    forgotSubmit: 'Email me a reset link',
    back: 'Back to sign-in',
  },
  invitation: {
    heading: 'Not a partner yet?',
    body: 'Partner accounts are by invitation. Tell us about your agency and the businesses you work with, and we’ll set one up.',
    link: 'Ask about partnering',
  },
  steps: [
    {
      title: 'Submit a business',
      detail: 'Add its website or Instagram, its city, and up to six competitors from your dashboard.',
    },
    {
      title: 'We run the audit',
      detail: 'New Wave: Social Engineering reviews each request and runs it on Groundswell, our audit engine, from public data only.',
    },
    {
      title: 'Download the reports',
      detail: 'The summary, slides, and full audit appear in your dashboard as view-only Google Drive links you can forward.',
    },
  ],
} as const;
