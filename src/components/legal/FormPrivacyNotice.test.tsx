import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import FormPrivacyNotice from './FormPrivacyNotice';

/** Every public form that collects contact details carries the notice under its submit button. */
const PUBLIC_FORMS = [
  'src/components/Contact.tsx',
  'src/components/QuoteModal.tsx',
  'src/components/support/SupportChatCard.tsx',
  'src/components/support/SupportEmailCard.tsx',
  'src/components/support/CustomerPortalCard.tsx',
  'src/divisions/socialEngineering/pages/SocialEngineeringPartnersPage.tsx',
  'src/divisions/socialEngineering/pages/SocialEngineeringPartnerAppPage.tsx',
];

describe('FormPrivacyNotice', () => {
  it('names the operator and links both policies with router links inside a router', () => {
    render(
      <MemoryRouter>
        <FormPrivacyNotice action="Sending this message" />
      </MemoryRouter>,
    );
    const notice = screen.getByTestId('form-privacy-notice');
    expect(notice).toHaveTextContent(/Sending this message sends your details to New Wave IT LLC/);
    expect(notice).toHaveTextContent(/By submitting, you agree to our Terms and Conditions/);
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
    expect(screen.getByRole('link', { name: 'Terms and Conditions' })).toHaveAttribute('href', '/terms-and-conditions');
  });

  it('falls back to plain anchors outside a router and prefixes the detail sentence', () => {
    render(<FormPrivacyNotice action="Starting a chat" detail="Your first message is texted to a technician." />);
    expect(screen.getByTestId('form-privacy-notice')).toHaveTextContent(/^Your first message is texted to a technician\. Starting a chat sends/);
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy-policy');
  });

  it.each(PUBLIC_FORMS)('%s renders the notice', (file) => {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/import FormPrivacyNotice from '[./]+(components\/)?legal\/FormPrivacyNotice';/);
    expect(source).toMatch(/<FormPrivacyNotice action="/);
  });
});
