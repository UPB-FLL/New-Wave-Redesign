import { useState } from 'react';
import { AlertCircle, CheckCircle, Mail, Send } from 'lucide-react';
import { ApiError, sendSupportEmail } from '../../lib/supportApi';

const SUPPORT_INBOX = 'support@newwaveitfl.com';

const emptyForm = { name: '', email: '', subject: '', message: '', website: '' };

export default function SupportEmailCard() {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const update = (field: keyof typeof emptyForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);

    try {
      await sendSupportEmail(form);
      setSent(true);
      setForm(emptyForm);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'We could not send your message. Please try again or call us.'
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div
        className="bg-white rounded-2xl p-8 sm:p-12 text-center shadow-lg"
        style={{ border: '1px solid rgba(94,188,103,0.35)' }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-5 mx-auto"
          style={{ background: 'rgba(94,188,103,0.12)' }}
        >
          <CheckCircle size={32} style={{ color: '#5EBC67' }} />
        </div>
        <h3
          className="text-2xl sm:text-3xl mb-3"
          style={{ fontFamily: "'Staatliches', 'Impact', sans-serif", color: '#152232' }}
        >
          Message sent
        </h3>
        <p className="max-w-md mx-auto mb-6" style={{ color: 'rgba(21,34,50,0.65)', lineHeight: 1.6 }}>
          It landed in <strong>{SUPPORT_INBOX}</strong>. A technician will reply to the email address
          you gave us.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{ color: '#39CCCC', border: '1px solid #39CCCC' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(57,204,204,0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg"
      style={{ border: '1px solid rgba(21,34,50,0.07)' }}
    >
      <div className="flex items-start gap-4 mb-6">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(57,204,204,0.12)' }}
        >
          <Mail size={20} style={{ color: '#39CCCC' }} />
        </div>
        <div>
          <h3
            className="text-xl sm:text-2xl leading-tight"
            style={{ fontFamily: "'Staatliches', 'Impact', sans-serif", color: '#152232' }}
          >
            Email support
          </h3>
          <p className="text-sm mt-1" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Goes straight to{' '}
            <a href={`mailto:${SUPPORT_INBOX}`} className="font-medium" style={{ color: '#39CCCC' }}>
              {SUPPORT_INBOX}
            </a>
            .
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="support-name"
              className="block text-sm font-medium mb-2"
              style={{ color: 'rgba(21,34,50,0.75)' }}
            >
              Full name
            </label>
            <input
              id="support-name"
              type="text"
              value={form.name}
              onChange={update('name')}
              placeholder="John Smith"
              maxLength={100}
              required
              className="input-light"
            />
          </div>
          <div>
            <label
              htmlFor="support-email"
              className="block text-sm font-medium mb-2"
              style={{ color: 'rgba(21,34,50,0.75)' }}
            >
              Email
            </label>
            <input
              id="support-email"
              type="email"
              value={form.email}
              onChange={update('email')}
              placeholder="john@company.com"
              maxLength={254}
              required
              className="input-light"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="support-subject"
            className="block text-sm font-medium mb-2"
            style={{ color: 'rgba(21,34,50,0.75)' }}
          >
            Subject
          </label>
          <input
            id="support-subject"
            type="text"
            value={form.subject}
            onChange={update('subject')}
            placeholder="Outlook will not connect on two workstations"
            maxLength={200}
            required
            className="input-light"
          />
        </div>

        <div>
          <label
            htmlFor="support-message"
            className="block text-sm font-medium mb-2"
            style={{ color: 'rgba(21,34,50,0.75)' }}
          >
            What is happening?
          </label>
          <textarea
            id="support-message"
            value={form.message}
            onChange={update('message')}
            placeholder="Tell us what you are seeing, when it started, and who is affected."
            rows={6}
            maxLength={5000}
            required
            className="input-light resize-none"
          />
        </div>

        {/* Honeypot — hidden from people, irresistible to bots. */}
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={update('website')}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        {error && (
          <div
            className="flex items-start gap-2 p-3 rounded-lg text-sm"
            style={{ background: 'rgba(255,68,68,0.08)', color: '#c53030' }}
            role="alert"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
          style={{ background: '#39CCCC', boxShadow: '0 4px 12px rgba(57,204,204,0.3)' }}
        >
          {sending ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Sending…
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
