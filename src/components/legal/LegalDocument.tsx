import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LEGAL_HUB_PATH } from '../../lib/legalDocuments';

/**
 * Shared building blocks for the legal pages: the same classes the three
 * policy pages use inline, so every document under /legal reads as one set.
 */

export const LEGAL_SECTION_CLASS = 'space-y-3';
export const LEGAL_HEADING_CLASS = 'text-2xl font-semibold tracking-tight text-slate-900';
export const LEGAL_LIST_CLASS = 'list-disc space-y-2 pl-6';
export const LEGAL_ORDERED_LIST_CLASS = 'list-decimal space-y-2 pl-6';
export const LEGAL_LINK_CLASS = 'font-medium text-teal-700 underline decoration-teal-300 underline-offset-4 hover:text-teal-900';

/** A numbered or named clause with its own anchor, matching the policy pages' sections. */
export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className={LEGAL_SECTION_CLASS} aria-labelledby={id}>
      <h2 id={id} className={LEGAL_HEADING_CLASS}>{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items, ordered = false }: { items: ReactNode[]; ordered?: boolean }) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={ordered ? LEGAL_ORDERED_LIST_CLASS : LEGAL_LIST_CLASS}>
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </Tag>
  );
}

export function LegalLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className={LEGAL_LINK_CLASS} to={to}>
      {children}
    </Link>
  );
}

/** The note every service document opens with: where it sits in the agreement set. */
export function AgreementSetNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border px-4 py-3 text-sm leading-6" style={{ borderColor: 'var(--nw-mist-gray)', background: 'var(--nw-pure-white)' }}>
      {children} All current documents are listed on the{' '}
      <LegalLink to={LEGAL_HUB_PATH}>Legal</LegalLink> page.
    </p>
  );
}

export function LegalContact() {
  return (
    <LegalSection id="contact-us" title="Contact Us">
      <address className="not-italic">
        New Wave IT LLC<br />
        710 NW 5th Ave, Suite 1072<br />
        Fort Lauderdale, FL 33311<br />
        <a className={LEGAL_LINK_CLASS} href="mailto:support@newwaveitfl.com">support@newwaveitfl.com</a>
      </address>
    </LegalSection>
  );
}
