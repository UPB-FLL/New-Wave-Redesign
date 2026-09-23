import type { ContactDetails } from '../../components/Contact';
import type { ContentMap } from '../../lib/content';
import { useContent } from '../../lib/useContent';

// The division's phone, email, and address come from one place: the CMS
// 'footer' section, which the division footer (and New Wave IT's) reads.

/** What the footer shows while the CMS has no email or address. */
export const FOOTER_EMAIL_FALLBACK = 'support@newwaveitfl.com';
export const FOOTER_ADDRESS_FALLBACK = '710 NW 5th Ave, Suite 1072, Fort Lauderdale, FL 33311';
/**
 * A sample number (555-0100 is reserved for fiction), not the business's
 * phone. The footer still falls back to it; no other division surface may show it.
 */
export const PLACEHOLDER_PHONE = '(954) 555-0100';

/** 555-0100 through 555-0199, with or without an area code and country code. */
const FICTIONAL_NUMBER = /^(?:1?\d{3})?55501\d{2}$/;
/** A trailing extension ("ext. 2", "x12", "#3"), which is not part of the number. */
const EXTENSION = /\s*(?:ext\.?|extension|x|#)\s*\d+\s*$/i;

const isFictional = (phone: string) => FICTIONAL_NUMBER.test(phone.replace(EXTENSION, '').replace(/\D/g, ''));

/** "Street, Suite, City, ST ZIP" → street and suite, then city on a second line. */
function twoLines(address: string): string {
  const parts = address.split(/,\s*/);
  return parts.length >= 3 ? `${parts.slice(0, -2).join(', ')}\n${parts.slice(-2).join(', ')}` : address;
}

/**
 * Contact details from the footer's CMS values, for the Contact us page. The
 * email and address fall back exactly as the footer does; the phone does not
 * fall back at all, so without a real number the page leaves the Call row out.
 */
export function divisionContactDetails(footer: ContentMap): ContactDetails {
  const phone = footer.phone?.trim();
  return {
    phone: phone && !isFictional(phone) ? phone : undefined,
    email: footer.email || FOOTER_EMAIL_FALLBACK,
    address: twoLines(footer.address || FOOTER_ADDRESS_FALLBACK),
  };
}

export function useDivisionContactDetails(): ContactDetails {
  return divisionContactDetails(useContent('footer'));
}
