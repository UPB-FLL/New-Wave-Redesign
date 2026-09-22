import { describe, expect, it } from 'vitest';
import { FOOTER_ADDRESS_FALLBACK, FOOTER_EMAIL_FALLBACK, PLACEHOLDER_PHONE, divisionContactDetails } from './contactDetails';

describe('divisionContactDetails (the Contact us page’s phone, email, and address)', () => {
  it('uses the footer’s CMS values', () => {
    expect(
      divisionContactDetails({ phone: '(954) 321-7788', email: 'hello@example.com', address: '1 Las Olas Blvd, Suite 2, Fort Lauderdale, FL 33301' }),
    ).toEqual({
      phone: '(954) 321-7788',
      email: 'hello@example.com',
      address: '1 Las Olas Blvd, Suite 2\nFort Lauderdale, FL 33301',
    });
  });

  it('falls back like the footer for email and address, but never to a phone number', () => {
    const details = divisionContactDetails({});
    expect(details.phone).toBeUndefined();
    expect(details.email).toBe(FOOTER_EMAIL_FALLBACK);
    expect(details.address.replace('\n', ', ')).toBe(FOOTER_ADDRESS_FALLBACK);
  });

  it('treats the placeholder and other reserved 555-01xx numbers as no number', () => {
    [PLACEHOLDER_PHONE, '954-555-0100', '+1 (305) 555-0142', '  '].forEach((phone) => {
      expect(divisionContactDetails({ phone }).phone, phone).toBeUndefined();
    });
    // A real 555 number outside the reserved range is kept.
    expect(divisionContactDetails({ phone: '(954) 555-2368' }).phone).toBe('(954) 555-2368');
  });

  it('keeps a one-line or two-part address as given', () => {
    expect(divisionContactDetails({ address: 'Fort Lauderdale, FL' }).address).toBe('Fort Lauderdale, FL');
  });
});
