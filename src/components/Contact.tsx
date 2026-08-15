import { useState } from 'react';
import { CheckCircle, Mail, MapPin, Phone, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useContent } from '../lib/useContent';
import { FadeIn } from './ui/fade-in';

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

const initialForm: FormData = { name: '', email: '', phone: '', company: '', message: '' };

export default function Contact({ headlineAs: HeadlineTag = 'h2' }: { headlineAs?: 'h1' | 'h2' } = {}) {
  const content = useContent('contact');
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const emailResponse = await fetch('/api/send-contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const { error: databaseError } = await supabase.from('contact_submissions').insert([form]);
      if (databaseError) console.error('Database error:', databaseError);

      setSubmitted(true);
      setForm(initialForm);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Something went wrong. Please try again or call us directly.',
      );
    } finally {
      setLoading(false);
    }
  };

  const phone = content.phone || '(954) 555-0100';
  const email = content.email || 'support@newwaveitfl.com';
  const address = content.address || '710 NW 5th Ave, Suite 1072';
  const addressCity = content.address_city || 'Fort Lauderdale, FL 33311';
  const contactMethods = [
    {
      icon: Phone,
      title: 'Call us',
      sub: content.phone_sub || 'Available 24/7 for emergencies',
      content: <a href={`tel:${phone.replace(/\D/g, '')}`} className="font-medium text-brand-tide-blue hover:underline">{phone}</a>,
      accent: 'var(--nw-signal-cyan)',
    },
    {
      icon: Mail,
      title: 'Email us',
      sub: content.email_sub || 'We respond within one business day',
      content: <a href={`mailto:${email}`} className="font-medium text-brand-tide-blue hover:underline">{email}</a>,
      accent: 'var(--nw-tide-blue)',
    },
    {
      icon: MapPin,
      title: 'Visit us',
      sub: `${address}\n${addressCity}`,
      content: content.address_sub ? <span className="text-sm text-[var(--nw-slate)]">{content.address_sub}</span> : null,
      accent: 'var(--nw-tide-blue)',
    },
  ];

  return (
    <section
      id="contact"
      className="relative py-12 sm:py-16"
      style={{ background: 'var(--nw-cloud-white)', borderTop: '1px solid var(--nw-mist-gray)', zIndex: 10 }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="mb-8 text-center sm:mb-10">
            <span className="nw-kicker">{content.section_label || 'Get in touch'}</span>
            <HeadlineTag className="nw-display mx-auto mb-4 mt-2 max-w-4xl text-4xl leading-[1.05] text-brand-navy sm:text-5xl lg:text-6xl">
              {content.headline || (
                <>
                  Ready to get started? <span className="text-brand-tide-blue">Let&apos;s talk.</span>
                </>
              )}
            </HeadlineTag>
            <p className="mx-auto max-w-xl text-sm text-[var(--nw-slate)] sm:text-base">
              {content.subheadline || 'Fill out the form and a technician will reach out within one business day. For urgent issues, call us now.'}
            </p>
          </div>
        </FadeIn>

        <div className="grid gap-5 sm:gap-8 lg:grid-cols-5">
          <FadeIn className="lg:col-span-2">
            <div className="flex flex-col gap-3">
              {contactMethods.map(({ icon: Icon, title, sub, content: methodContent, accent }) => (
                <div key={title} className="rounded-lg p-5 nw-surface">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'var(--nw-cloud-white)', color: accent }}>
                    <Icon size={18} />
                  </div>
                  <h3 className="mb-1 font-semibold text-brand-navy">{title}</h3>
                  <p className="mb-1.5 whitespace-pre-line text-xs text-[var(--nw-slate)]">{sub}</p>
                  {methodContent}
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.15} className="lg:col-span-3">
            {submitted ? (
              <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg p-8 text-center nw-surface" style={{ borderColor: 'var(--nw-continuity-green)' }}>
                <div className="nw-icon-success mb-5 h-16 w-16">
                  <CheckCircle size={32} />
                </div>
                <h3 className="nw-display mb-3 text-2xl text-brand-navy">{content.success_title || 'Message received'}</h3>
                <p className="max-w-sm text-[var(--nw-slate)]">
                  {content.success_body || 'Thanks for reaching out. A member of our team will contact you within one business day. For urgent issues, please call us directly.'}
                </p>
                <button type="button" onClick={() => setSubmitted(false)} className="mt-6 text-sm font-semibold text-brand-tide-blue hover:underline">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rounded-lg p-5 sm:p-6 nw-surface">
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Full name <span className="text-brand-cyan">*</span>
                    </label>
                    <input id="contact-name" type="text" name="name" value={form.name} onChange={handleChange} required placeholder="John Smith" className="input-light" />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-brand-navy">
                      Email address <span className="text-brand-cyan">*</span>
                    </label>
                    <input id="contact-email" type="email" name="email" value={form.email} onChange={handleChange} required placeholder="john@company.com" className="input-light" />
                  </div>
                  <div>
                    <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-brand-navy">Phone number</label>
                    <input id="contact-phone" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="(954) 555-0100" className="input-light" />
                  </div>
                  <div>
                    <label htmlFor="contact-company" className="mb-1.5 block text-sm font-medium text-brand-navy">Company name</label>
                    <input id="contact-company" type="text" name="company" value={form.company} onChange={handleChange} placeholder="Acme Corp" className="input-light" />
                  </div>
                </div>

                <div className="mb-4">
                  <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-brand-navy">
                    How can we help? <span className="text-brand-cyan">*</span>
                  </label>
                  <textarea id="contact-message" name="message" value={form.message} onChange={handleChange} required rows={4} placeholder="Tell us about your IT needs or current challenges..." className="input-light resize-none" />
                </div>

                {error ? <p className="mb-3 text-sm text-[#b42318]" role="alert">{error}</p> : null}

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
                      <Send size={18} />
                      Send message
                    </>
                  )}
                </button>
              </form>
            )}
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
