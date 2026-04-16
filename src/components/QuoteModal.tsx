import { useState } from 'react';
import { X, Send } from 'lucide-react';

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setForm({
          name: '',
          email: '',
          phone: '',
          company: '',
          tier: tier?.name || '',
          message: '',
        });
      }, 2000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputClass = "w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors";
  const inputStyle = { background: 'white', border: '1.5px solid rgba(21,34,50,0.12)', color: '#152232' };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <h2 className="text-xl font-bold" style={{ color: '#152232' }}>
            Get a Quote
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} style={{ color: '#152232' }} />
          </button>
        </div>

        <div className="p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'rgba(94,188,103,0.12)' }}>
                <svg className="w-8 h-8" style={{ color: '#5EBC67' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: '#152232' }}>
                Quote Request Sent!
              </h3>
              <p style={{ color: 'rgba(21,34,50,0.6)' }}>
                We'll review your request and get back to you shortly.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {tier && (
                <div className="p-4 rounded-lg mb-4" style={{ background: 'rgba(57,204,204,0.08)', border: '1px solid rgba(57,204,204,0.2)' }}>
                  <p className="text-sm font-medium" style={{ color: '#152232' }}>
                    {tier.name}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(21,34,50,0.6)' }}>
                    {tier.price} {tier.period}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(21,34,50,0.75)' }}>
                  Full Name <span style={{ color: '#39CCCC' }}>*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  placeholder="John Smith"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(21,34,50,0.75)' }}>
                  Email Address <span style={{ color: '#39CCCC' }}>*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="john@company.com"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(21,34,50,0.75)' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(954) 555-0100"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(21,34,50,0.75)' }}>
                  Company Name
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  placeholder="Acme Corp"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'rgba(21,34,50,0.75)' }}>
                  Additional Details
                </label>
                <textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Tell us about your needs..."
                  className={`${inputClass} resize-none`}
                  style={inputStyle}
                />
              </div>

              {error && <p className="text-sm" style={{ color: '#e05252' }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
                style={{ background: '#39CCCC', boxShadow: '0 4px 12px rgba(57,204,204,0.3)' }}
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
                    <Send size={16} />
                    Request Quote
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
