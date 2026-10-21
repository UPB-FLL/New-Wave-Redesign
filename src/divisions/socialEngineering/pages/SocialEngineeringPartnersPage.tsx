import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormPrivacyNotice from '../../../components/legal/FormPrivacyNotice';
import { currentPartner, partnerSignIn, requestPartnerReset } from '../../../lib/groundswellPartner';
import { DivisionLayout } from '../components/DivisionLayout';
import { Band, DivisionHero, SectionIntro, StepList } from '../components/sections';
import { partnersContent } from '../content';
import { NwseIcon } from '../icons/NwseIcon';
import { partnersPageSeo } from '../seo';
import { DIVISION_CONTACT_US_PATH, DIVISION_PARTNER_DASHBOARD_PATH } from '../site';
import { useDivisionMeta } from '../useDivisionMeta';

const seo = partnersPageSeo();

const field = 'input-light';
const label = 'mb-1.5 block text-sm font-medium text-brand-navy';

/** Email and password sign-in, with a forgot-password view. Partner accounts are by invitation. */
function SignInCard() {
  const content = partnersContent.signIn;
  const navigate = useNavigate();
  const [mode, setMode] = useState<'sign-in' | 'forgot'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'sign-in') {
        await partnerSignIn(email, password);
        navigate(DIVISION_PARTNER_DASHBOARD_PATH);
      } else {
        setNotice(await requestPartnerReset(email));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong; try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="nw-surface self-start rounded-lg p-5 sm:p-6" aria-labelledby="partner-sign-in-heading">
      <h2 id="partner-sign-in-heading" className="nwse-type-title-1 text-[var(--nw-current-navy)]">
        {mode === 'sign-in' ? content.heading : content.forgot}
      </h2>
      <div className="mt-4">
        <label htmlFor="partner-email" className={label}>
          {content.emailLabel}
        </label>
        <input id="partner-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </div>
      {mode === 'sign-in' ? (
        <div className="mt-4">
          <label htmlFor="partner-password" className={label}>
            {content.passwordLabel}
          </label>
          <input
            id="partner-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
        </div>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-[#b42318]" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm text-[var(--nw-slate)]" role="status">
          {notice}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="nwse-btn nwse-btn-amber-deep mt-5 w-full justify-center disabled:opacity-60">
        {mode === 'sign-in' ? content.submit : content.forgotSubmit}
      </button>
      {mode === 'sign-in' ? <FormPrivacyNotice action="Signing in" /> : <FormPrivacyNotice action="Requesting a reset link" />}
      <button
        type="button"
        className="mt-4 text-sm font-semibold text-[var(--nwse-lure-amber-deep)] underline-offset-4 hover:underline max-sm:min-h-11"
        onClick={() => {
          setMode(mode === 'sign-in' ? 'forgot' : 'sign-in');
          setError(null);
          setNotice(null);
        }}
      >
        {mode === 'sign-in' ? content.forgot : content.back}
      </button>
    </form>
  );
}

/**
 * The partner portal's front door: what partners do here, and sign-in. A
 * partner who is already signed in (this tab) gets a link to the dashboard.
 */
export default function SocialEngineeringPartnersPage() {
  useDivisionMeta(seo);
  const content = partnersContent;
  const [signedIn, setSignedIn] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    currentPartner()
      .then((p) => live && setSignedIn(p?.company ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  return (
    <DivisionLayout>
      <DivisionHero
        breadcrumbs={seo.breadcrumbs}
        kicker={content.kicker}
        headline={content.headline}
        summary={content.summary}
        actions={
          signedIn ? (
            <Link to={DIVISION_PARTNER_DASHBOARD_PATH} className="nwse-btn nwse-btn-amber">
              Open the {signedIn} dashboard
              <NwseIcon name="arrow-right" size={16} />
            </Link>
          ) : null
        }
      />
      <Band tone="white" labelledBy="partner-sign-in-heading">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
          <SignInCard />
          <div>
            <SectionIntro kicker="How it works" title="Three steps per business" />
            <StepList steps={content.steps} />
            <div className="nwse-card mt-8 p-4 sm:p-5">
              <h2 className="nwse-type-title-2 text-[var(--nw-current-navy)]">{content.invitation.heading}</h2>
              <p className="nwse-type-body-small mt-2 text-[var(--nw-slate)]">{content.invitation.body}</p>
              <Link
                to={DIVISION_CONTACT_US_PATH}
                className="mt-3 inline-flex items-center gap-1.5 font-semibold text-[var(--nwse-lure-amber-deep)] underline-offset-4 hover:underline max-sm:min-h-11"
              >
                {content.invitation.link}
                <NwseIcon name="arrow-right" size={16} className="shrink-0" />
              </Link>
            </div>
          </div>
        </div>
      </Band>
    </DivisionLayout>
  );
}
