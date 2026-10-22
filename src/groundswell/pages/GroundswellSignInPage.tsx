import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FormPrivacyNotice from '../../components/legal/FormPrivacyNotice';
import { currentPartner, partnerSignIn, requestPartnerReset } from '../../lib/groundswellPartner';
import { GroundswellFrame } from '../GroundswellShell';
import { signInContent } from '../content';
import { GROUNDSWELL_ADMIN_PATH, GROUNDSWELL_PROSPECTS_PATH } from '../site';

/**
 * Groundswell's front door (/groundswell): partner email and password, a
 * reset link, and the way in for New Wave staff. The page's head is set by
 * src/pages/GroundswellSignInPage.tsx, which prerenders it like any New Wave
 * IT page. A partner already signed in (this tab) gets a link to their customers.
 */

const field = 'input-light';
const CONTACT_PATH = '/social-engineering/contact-us';

function SignInCard() {
  const content = signInContent.signIn;
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
        navigate(GROUNDSWELL_PROSPECTS_PATH);
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
    <form onSubmit={submit} className="gs-card self-start p-5 sm:p-6" aria-labelledby="partner-sign-in-heading">
      <h2 id="partner-sign-in-heading" className="text-xl font-bold">
        {mode === 'sign-in' ? content.heading : content.forgot}
      </h2>
      <div className="mt-4">
        <label htmlFor="partner-email" className="gs-label">
          {content.emailLabel}
        </label>
        <input id="partner-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
      </div>
      {mode === 'sign-in' ? (
        <div className="mt-4">
          <label htmlFor="partner-password" className="gs-label">
            {content.passwordLabel}
          </label>
          <input id="partner-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
        </div>
      ) : null}
      {error ? (
        <p className="gs-alert mt-3" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="gs-notice mt-3" role="status">
          {notice}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="gs-btn gs-btn-primary mt-5 w-full">
        {mode === 'sign-in' ? content.submit : content.forgotSubmit}
      </button>
      {mode === 'sign-in' ? <FormPrivacyNotice action="Signing in" /> : <FormPrivacyNotice action="Requesting a reset link" />}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
        <button
          type="button"
          className="gs-link max-sm:min-h-11"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'forgot' : 'sign-in');
            setError(null);
            setNotice(null);
          }}
        >
          {mode === 'sign-in' ? content.forgot : content.back}
        </button>
        <Link to={GROUNDSWELL_ADMIN_PATH} className="gs-muted underline-offset-4 hover:underline max-sm:min-h-11">
          {content.staff}
        </Link>
      </div>
    </form>
  );
}

export default function GroundswellSignInPage() {
  const content = signInContent;
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
    <GroundswellFrame>
      <div className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gs-accent-deep)' }}>
          {content.kicker}
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{content.headline}</h1>
        <p className="mt-3 text-base gs-muted sm:text-lg">{content.summary}</p>
        {signedIn ? (
          <Link to={GROUNDSWELL_PROSPECTS_PATH} className="gs-btn gs-btn-primary mt-5">
            Open {signedIn}’s customers
          </Link>
        ) : null}
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-16">
        <SignInCard />
        <div>
          <h2 className="text-lg font-bold">How it works</h2>
          <ol className="mt-4 space-y-4">
            {content.steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'rgba(242,163,58,0.18)', color: 'var(--gs-accent-deep)' }} aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm gs-muted">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="gs-card mt-8 p-4 sm:p-5">
            <h2 className="text-base font-bold">{content.invitation.heading}</h2>
            <p className="mt-2 text-sm gs-muted">{content.invitation.body}</p>
            <Link to={CONTACT_PATH} className="gs-link mt-3 inline-flex items-center max-sm:min-h-11">
              {content.invitation.link} →
            </Link>
          </div>
        </div>
      </div>
    </GroundswellFrame>
  );
}
