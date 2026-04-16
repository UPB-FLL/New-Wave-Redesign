import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useContent } from '../lib/useContent';

interface FormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
}

const initialForm: FormData = { name: '', email: '', phone: '', company: '', message: '' };

export default function Contact() {
  const c = useContent('contact');
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Send email via API
      const emailResponse = await fetch('/api/send-contact-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      // Also save to Supabase for record-keeping
      const { error: dbError } = await supabase.from('contact_submissions').insert([form]);

      if (dbError) {
        console.error('Database error:', dbError);
        // Still consider it a success if email was sent
      }

      setSubmitted(true);
      setForm(initialForm);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again or call us directly.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-colors";
  const inputStyle = { background: 'white', border: '1.5px solid rgba(21,34,50,0.12)', color: '#152232' };

  const phone = c.phone || '(954) 555-0100';
  const email = c.email || 'support@newwaveitfl.com';
  const address = c.address || '710 NW 5th Ave, Suite 1072';
  const addressCity = c.address_city || 'Fort Lauderdale, FL 33311';

  return (
    <section
      id="contact"
      className="py-28"
      style={{ background: '#f8fafb', borderTop: '1px solid rgba(21,34,50,0.06)' }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#39CCCC' }}>
            {c.section_label || 'Get In Touch'}
          </span>
          <h2
            className="text-4xl lg:text-5xl mt-3 mb-5 leading-tight"
            style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
          >
            {c.headline || 'Ready to get started?'}{' '}
            <span style={{ color: '#39CCCC' }}>{c.headline_accent || "Let's talk."}</span>
          </h2>
          <p className="text-lg max-w-xl mx-auto" style={{ color: 'rgba(21,34,50,0.6)' }}>
            {c.subheadline || 'Fill out the form below and one of our technicians will reach out within one business day — or call us now for immediate assistance.'}
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 flex flex-col gap-6">
            {[
              {
                icon: Phone,
                title: 'Call Us',
                sub: c.phone_sub || 'Available 24/7 for emergencies',
                content: <a href={`tel:${phone.replace(/\D/g, '')}`} className="font-medium transition-colors" style={{ color: '#39CCCC' }}>{phone}</a>,
                accent: '#39CCCC',
              },
              {
                icon: Mail,
                title: 'Email Us',
                sub: c.email_sub || 'We respond within one business day',
                content: <a href={`mailto:${email}`} className="font-medium transition-colors" style={{ color: '#39CCCC' }}>{email}</a>,
                accent: '#39CCCC',
              },
              {
                icon: MapPin,
                title: 'Visit Us',
                sub: `${address}\n${addressCity}`,
                content: c.address_sub ? <span className="text-sm" style={{ color: 'rgba(21,34,50,0.55)' }}>{c.address_sub}</span> : null,
                accent: '#5EBC67',
              },
            ].map(({ icon: Icon, title, sub, content, accent }) => (
              <div
                key={title}
                className="rounded-2xl p-6"
                style={{ background: 'white', border: '1px solid rgba(21,34,50,0.07)', boxShadow: '0 2px 12px rgba(21,34,50,0.05)' }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: `${accent}15` }}>
                  <Icon size={20} style={{ color: accent }} />
                </div>
                <h3 className="font-semibold mb-1" style={{ color: '#152232' }}>{title}</h3>
                <p className="text-sm mb-2 whitespace-pre-line" style={{ color: 'rgba(21,34,50,0.55)' }}>{sub}</p>
                {content}
              </div>
            ))}
          </div>

          <div className="lg:col-span-3">
            {submitted ? (
              <div
                className="rounded-2xl p-12 flex flex-col items-center justify-center text-center h-full min-h-[400px]"
                style={{ background: 'white', border: '1px solid rgba(94,188,103,0.3)', boxShadow: '0 4px 24px rgba(21,34,50,0.06)' }}
              >
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(94,188,103,0.12)' }}>
                  <CheckCircle size={32} style={{ color: '#5EBC67' }} />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#152232' }}>{c.success_title || 'Message Received!'}</h3>
                <p className="max-w-sm" style={{ color: 'rgba(21,34,50,0.6)' }}>
                  {c.success_body || 'Thanks for reaching out. A member of our team will contact you within one business day. For urgent issues, please call us directly.'}
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-6 text-sm font-medium transition-colors"
                  style={{ color: '#39CCCC' }}
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="rounded-2xl p-8"
                style={{ background: 'white', border: '1px solid rgba(21,34,50,0.07)', boxShadow: '0 4px 24px rgba(21,34,50,0.06)' }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>
                      Full Name <span style={{ color: '#39CCCC' }}>*</span>
                    </label>
                    <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="John Smith" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>
                      Email Address <span style={{ color: '#39CCCC' }}>*</span>
                    </label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="john@company.com" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>Phone Number</label>
                    <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="(954) 555-0100" className={inputClass} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>Company Name</label>
                    <input type="text" name="company" value={form.company} onChange={handleChange} placeholder="Acme Corp" className={inputClass} style={inputStyle} />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2" style={{ color: 'rgba(21,34,50,0.75)' }}>
                    How can we help? <span style={{ color: '#39CCCC' }}>*</span>
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Tell us about your IT needs or current challenges..."
                    className={`${inputClass} resize-none`}
                    style={inputStyle}
                  />
                </div>

                {error && <p className="text-sm mb-4" style={{ color: '#e05252' }}>{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2.5 text-white font-semibold px-8 py-4 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
                  style={{ background: '#39CCCC', boxShadow: '0 8px 24px rgba(57,204,204,0.3)' }}
                  onMouseEnter={(e) => { if (!loading) (e.currentTarget.style.background = '#2db8b8'); }}
                  onMouseLeave={(e) => { if (!loading) (e.currentTarget.style.background = '#39CCCC'); }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    <>
                      <Send size={18} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
