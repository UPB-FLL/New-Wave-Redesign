// Copy for Groundswell's sign-in page (/groundswell). Pure data.
//
// Partners are outside agencies and resellers. They submit businesses for a
// Croissance audit and get the reports as Google Drive links. Accounts are by
// invitation only. Never promise turnaround times or results here.

export const signInContent = {
  metaTitle: 'Groundswell — Partner & Staff Sign-In',
  metaDescription:
    'Sign in to Groundswell, New Wave IT’s audit portal, to submit businesses for a Croissance growth audit and download each one’s summary, slides, and full audit.',
  keywords: 'groundswell portal, croissance partner portal, marketing audit partners, agency partners, growth audit reseller, new wave it',
  kicker: 'For agencies and resellers',
  headline: 'Groundswell',
  summary: 'Partners submit businesses for a Croissance audit and get its reports, in each business’s own brand, as Google Drive links.',
  signIn: {
    heading: 'Partner sign-in',
    emailLabel: 'Email',
    passwordLabel: 'Password',
    submit: 'Sign in',
    forgot: 'Forgot your password?',
    forgotSubmit: 'Email me a reset link',
    back: 'Back to sign-in',
    staff: 'New Wave staff sign-in',
  },
  invitation: {
    heading: 'Not a partner yet?',
    body: 'Partner accounts are by invitation. Tell us about your agency and the businesses you work with, and we’ll set one up.',
    link: 'Ask about partnering',
  },
  steps: [
    {
      title: 'Add a customer',
      detail: 'Add its website or Instagram, its city, and up to six competitors.',
    },
    {
      title: 'We run the audit',
      detail: 'New Wave IT runs it on Groundswell, our audit engine, from public data only.',
    },
    {
      title: 'Download the reports',
      detail: 'The summary, slides, and full audit appear under the customer as view-only Google Drive links you can forward.',
    },
  ],
} as const;
