import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
    <form onSubmit={submit} className="gs-card gs-portal-sign-in" aria-labelledby="partner-sign-in-heading">
      <p className="gs-portal-eyebrow">Welcome back</p>
      <h2 id="partner-sign-in-heading" className="text-xl font-bold">
        {mode === 'sign-in' ? content.heading : content.forgot}
      </h2>
      <div className="mt-4">
        <label htmlFor="partner-email" className="gs-label">
          {content.emailLabel}
        </label>
        <input
          id="partner-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={field}
        />
      </div>
      {mode === 'sign-in' ? (
        <div className="mt-4">
          <label htmlFor="partner-password" className="gs-label">
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
      <div className="gs-portal-entry-grid">
        <section className="gs-portal-intro">
          <p className="gs-portal-eyebrow">{content.kicker}</p>
          <h1>{content.headline}</h1>
          <p className="gs-portal-intro-summary">{content.summary}</p>
          {signedIn ? (
            <Link to={GROUNDSWELL_PROSPECTS_PATH} className="gs-btn gs-btn-primary">
              Open {signedIn}’s customers
            </Link>
          ) : null}
        </section>
        <div className="gs-portal-entry-forms">
          <SignInCard />
          <section className="gs-portal-invitation">
            <h2>{content.invitation.heading}</h2>
            <p>{content.invitation.body}</p>
            <Link to={CONTACT_PATH} className="gs-link">
              {content.invitation.link} <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>
        <section className="gs-portal-intro gs-portal-how" aria-label="How GroundSwell works">
          <ol className="gs-portal-entry-steps" aria-label="How it works">
            {content.steps.map((step) => (
              <li key={step.title}>
                <span aria-hidden="true"><ArrowRight size={16} /></span>
                <div>
                  <h2>{step.title}</h2>
                  <p>{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </GroundswellFrame>
  );
}
