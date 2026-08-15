import { useState } from 'react';
import { CheckCircle, Send, X } from 'lucide-react';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tier: {
    name: string;
    price: string;
    period: string;
  } | null;
}

interface QuoteFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  tier: string;
  message: string;
}

export default function QuoteModal({ isOpen, onClose, tier }: QuoteModalProps) {
  const [form, setForm] = useState<QuoteFormData>({
    name: '',
    email: '',
    phone: '',
    company: '',
    tier: tier?.name || '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setSubmitted(false);
    setForm({ name: '', email: '', phone: '', company: '', tier: tier?.name || '', message: '' });
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const emailResponse = await fetch('/api/send-quote-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send quote request');
      }

      setSubmitted(true);
      window.setTimeout(() => {
        onClose();
        reset();
      }, 2000);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(9, 19, 29, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quote-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg nw-surface">
        <div className="sticky top-0 flex items-center justify-between border-b p-5" style={{ background: 'var(--nw-pure-white)', borderColor: 'var(--nw-mist-gray)' }}>
          <h2 id="quote-modal-title" className="nw-display text-xl text-brand-navy">Get a quote</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-brand-navy transition-colors hover:bg-[var(--nw-cloud-white)]" aria-label="Close modal" title="Close modal">
            <X size={22} />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          {submitted ? (
            <div className="py-8 text-center">
              <div className="nw-icon-success mx-auto mb-4 h-16 w-16">
                <CheckCircle size={32} />
              </div>
              <h3 className="nw-display mb-2 text-lg text-brand-navy">Quote request sent</h3>
              <p className="text-[var(--nw-slate)]">We&apos;ll review your request and get back to you shortly.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {tier ? (
                <div className="rounded-md border p-4" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-tide-blue)' }}>
                  <p className="text-sm font-medium text-brand-navy">{tier.name}</p>
                  <p className="mt-1 text-xs text-[var(--nw-slate)]">{tier.price} {tier.period}</p>
                </div>
              ) : null}

              <div>
                <label htmlFor="quote-name" className="mb-1.5 block text-sm font-medium text-brand-navy">Full name <span className="text-brand-cyan">*</span></label>
                <input id="quote-name" type="text" name="name" value={form.name} onChange={handleChange} required placeholder="John Smith" className="input-light" />
              </div>
              <div>
                <label htmlFor="quote-email" className="mb-1.5 block text-sm font-medium text-brand-navy">Email address <span className="text-brand-cyan">*</span></label>
                <input id="quote-email" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="john@company.com" className="input-light" />
              </div>
              <div>
                <label htmlFor="quote-phone" className="mb-1.5 block text-sm font-medium text-brand-navy">Phone number</label>
                <input id="quote-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="(954) 555-0100" className="input-light" />
              </div>
              <div>
                <label htmlFor="quote-company" className="mb-1.5 block text-sm font-medium text-brand-navy">Company name</label>
                <input id="quote-company" type="text" name="company" value={form.company} onChange={handleChange} placeholder="Acme Corp" className="input-light" />
              </div>
              <div>
                <label htmlFor="quote-message" className="mb-1.5 block text-sm font-medium text-brand-navy">Additional details</label>
                <textarea id="quote-message" name="message" value={form.message} onChange={handleChange} rows={3} placeholder="Tell us about your needs..." className="input-light resize-none" />
              </div>

              {error ? <p className="text-sm text-[#b42318]" role="alert">{error}</p> : null}

              <button type="submit" disabled={loading} className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send size={17} />
                    Request quote
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
