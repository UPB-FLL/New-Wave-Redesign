import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { setPartnerPassword } from '../../lib/groundswellPartner';
import { GroundswellFrame } from '../GroundswellShell';
import { usePageMeta } from '../../lib/usePageMeta';
import { GROUNDSWELL_NAME, GROUNDSWELL_PATH } from '../site';

/** Where invite and reset links land (noindex, outside the sitemap and the prerender). */
export default function GroundswellSetPasswordPage() {
  usePageMeta({ title: `Choose your password | ${GROUNDSWELL_NAME}`, includeSiteName: false, noindex: true });
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError('The two passwords don’t match.');
      return;
    }
    setBusy(true);
    try {
      await setPartnerPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GroundswellFrame>
      <div className="max-w-md">
        <h1 className="text-3xl font-bold">Choose your password</h1>
        <p className="mt-2 text-sm gs-muted">Use at least 10 characters. A passphrase of a few words is easiest to remember.</p>
        <div className="mt-6">
          {!token ? (
            <p className="gs-alert" role="alert">
              This page needs the link from your invite or reset email.
            </p>
          ) : done ? (
            <div role="status" className="gs-card p-5">
              <p className="font-medium">Your password is saved.</p>
              <Link to={GROUNDSWELL_PATH} className="gs-btn gs-btn-primary mt-4">
                Sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} className="gs-card p-5 sm:p-6">
              <div>
                <label htmlFor="pw-new" className="gs-label">
                  New password
                </label>
                <input id="pw-new" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} className="input-light" />
              </div>
              <div className="mt-4">
                <label htmlFor="pw-confirm" className="gs-label">
                  Type it again
                </label>
                <input id="pw-confirm" type="password" autoComplete="new-password" minLength={10} required value={confirm} onChange={(e) => setConfirm(e.target.value)} className="input-light" />
              </div>
              {error ? (
                <p className="gs-alert mt-3" role="alert">
                  {error}
                </p>
              ) : null}
              <button type="submit" disabled={busy} className="gs-btn gs-btn-primary mt-5">
                Save password
              </button>
            </form>
          )}
        </div>
      </div>
    </GroundswellFrame>
  );
}
