import { Link, useInRouterContext } from 'react-router-dom';

/**
 * The notice-at-collection line that sits under every public form's submit
 * button. It names what happens to the submission and links the Privacy
 * Policy and Terms, so a visitor sees both before handing over contact
 * details (CalOPPA-style conspicuous notice; CCPA "notice at collection"
 * where that law applies).
 *
 * Renders router links when a router is present and plain anchors otherwise,
 * so the component works in any form, inside or outside the SPA shell.
 */

export const PRIVACY_POLICY_PATH = '/privacy-policy';
export const TERMS_PATH = '/terms-and-conditions';

interface FormPrivacyNoticeProps {
  /** What the submission does, e.g. "Sending this message". */
  action?: string;
  /** Extra sentence placed before the links, e.g. where a message is texted. */
  detail?: string;
  className?: string;
}

const LINK_CLASS = 'font-medium underline decoration-current/40 underline-offset-2 hover:decoration-current';

function PolicyLink({ to, children }: { to: string; children: string }) {
  const inRouter = useInRouterContext();
  if (inRouter) {
    return (
      <Link to={to} className={LINK_CLASS}>
        {children}
      </Link>
    );
  }
  return (
    <a href={to} className={LINK_CLASS}>
      {children}
    </a>
  );
}

export default function FormPrivacyNotice({ action = 'Submitting this form', detail, className = '' }: FormPrivacyNoticeProps) {
  return (
    <p data-testid="form-privacy-notice" className={`mt-3 text-xs leading-5 text-[var(--nw-slate)] ${className}`.trim()}>
      {detail ? `${detail} ` : ''}
      {action} sends your details to New Wave IT LLC, which uses them to respond to you as described in our{' '}
      <PolicyLink to={PRIVACY_POLICY_PATH}>Privacy Policy</PolicyLink>. By submitting, you agree to our{' '}
      <PolicyLink to={TERMS_PATH}>Terms and Conditions</PolicyLink>.
    </p>
  );
}
