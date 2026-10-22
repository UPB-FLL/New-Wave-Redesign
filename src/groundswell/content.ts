// Copy for GroundSwell's sign-in page (/groundswell). Pure data.
//
// Partners are outside agencies and resellers. They submit businesses for a
// Croissance audit and get the reports as Google Drive links. Accounts are by
// invitation only. Never promise turnaround times or results here.

export const signInContent = {
  metaTitle: 'GroundSwell — Partner & Staff Sign-In',
  metaDescription:
    'Sign in to GroundSwell to manage prospects and clients, follow their growth audit phases, and download branded reports.',
  keywords: 'groundswell portal, croissance partner portal, marketing audit partners, agency partners, growth audit reseller, new wave it',
  kicker: 'The partner workspace',
  headline: 'Built to move people.',
  summary: 'Manage prospects and clients, follow their audit phases, and share reports in each business’s own brand.',
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
      detail: 'Start with a website or Instagram, a city, and the competitors that matter.',
    },
    {
      title: 'Follow the work',
      detail: 'Follow the audit, competitor plan, and integrated plan. Link client accounts when you need their own figures.',
    },
    {
      title: 'Download the reports',
      detail: 'Open branded PDFs and the files for each completed phase, all in the customer’s workspace.',
    },
  ],
} as const;
