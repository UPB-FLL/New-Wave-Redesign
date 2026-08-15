import { useState } from 'react';
import { AlertCircle, CheckCircle, Mail, Send } from 'lucide-react';
import { ApiError, sendSupportEmail } from '../../lib/supportApi';

const supportInbox = 'support@newwaveitfl.com';
const emptyForm = { name: '', email: '', subject: '', message: '', website: '' };

export default function SupportEmailCard() {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof typeof emptyForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSending(true);

    try {
      await sendSupportEmail(form);
      setSent(true);
      setForm(emptyForm);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : 'We could not send your message. Please try again or call us.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="rounded-lg p-8 text-center sm:p-12 nw-surface" style={{ borderColor: 'var(--nw-continuity-green)' }}>
        <div className="nw-icon-success mx-auto mb-5 h-16 w-16">
          <CheckCircle size={32} />
        </div>
        <h3 className="nw-display mb-3 text-2xl text-brand-navy sm:text-3xl">Message sent</h3>
        <p className="mx-auto mb-6 max-w-md leading-relaxed text-[var(--nw-slate)]">
          It landed in <strong>{supportInbox}</strong>. A technician will reply to the email address you gave us.
        </p>
        <button type="button" onClick={() => setSent(false)} className="btn-secondary text-sm">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-6 sm:p-8 nw-surface">
      <div className="mb-6 flex items-start gap-4">
        <div className="nw-icon-signal h-11 w-11 shrink-0">
          <Mail size={20} />
        </div>
        <div>
          <h3 className="nw-display text-xl text-brand-navy sm:text-2xl">Email support</h3>
          <p className="mt-1 text-sm text-[var(--nw-slate)]">
            Goes straight to{' '}
            <a href={`mailto:${supportInbox}`} className="font-medium text-brand-tide-blue hover:underline">
              {supportInbox}
            </a>
            .
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="support-name" className="mb-2 block text-sm font-medium text-brand-navy">Full name</label>
            <input id="support-name" type="text" value={form.name} onChange={update('name')} placeholder="John Smith" maxLength={100} required className="input-light" />
          </div>
          <div>
            <label htmlFor="support-email" className="mb-2 block text-sm font-medium text-brand-navy">Email</label>
            <input id="support-email" type="email" value={form.email} onChange={update('email')} placeholder="john@company.com" maxLength={254} required className="input-light" />
          </div>
        </div>

        <div>
          <label htmlFor="support-subject" className="mb-2 block text-sm font-medium text-brand-navy">Subject</label>
          <input id="support-subject" type="text" value={form.subject} onChange={update('subject')} placeholder="Outlook will not connect on two workstations" maxLength={200} required className="input-light" />
        </div>

        <div>
          <label htmlFor="support-message" className="mb-2 block text-sm font-medium text-brand-navy">What is happening?</label>
          <textarea id="support-message" value={form.message} onChange={update('message')} placeholder="Tell us what you are seeing, when it started, and who is affected." rows={6} maxLength={5000} required className="input-light resize-none" />
        </div>

        <input type="text" name="website" value={form.website} onChange={update('website')} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

        {error ? (
          <div className="flex items-start gap-2 rounded-md bg-[#fef3f2] p-3 text-sm text-[#b42318]" role="alert">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <button type="submit" disabled={sending} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
          {sending ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <Send size={16} />
              Send to support
            </>
          )}
        </button>
      </form>
    </div>
  );
}
