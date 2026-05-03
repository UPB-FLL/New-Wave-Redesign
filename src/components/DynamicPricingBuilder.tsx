import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Send } from 'lucide-react';

interface PricingUnit {
  id: string;
  name: string;
  description: string;
  cost_per_unit: number;
  min_quantity: number;
  max_quantity: number;
}

interface Selection {
  id: string;
  quantity: number;
}

export default function DynamicPricingBuilder() {
  const [units, setUnits] = useState<PricingUnit[]>([]);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPricingUnits();
  }, []);

  useEffect(() => {
    calculateTotal();
  }, [selections, units]);

  const fetchPricingUnits = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('pricing_units')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      setUnits(data || []);

      const initialSelections: Record<string, number> = {};
      (data || []).forEach((unit) => {
        initialSelections[unit.id] = unit.min_quantity;
      });
      setSelections(initialSelections);
    } catch (err) {
      console.error('Failed to fetch pricing units:', err);
    }
  };

  const calculateTotal = () => {
    let total = 0;
    units.forEach((unit) => {
      const quantity = selections[unit.id] || 0;
      total += (unit.cost_per_unit / 100) * quantity;
    });
    setEstimatedTotal(total);
  };

  const handleQuantityChange = (unitId: string, quantity: number) => {
    const unit = units.find((u) => u.id === unitId);
    if (!unit) return;

    const q = Math.max(unit.min_quantity, Math.min(unit.max_quantity, quantity));
    setSelections((prev) => ({ ...prev, [unitId]: q }));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Name and email are required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectionDetails = units.map((unit) => ({
        name: unit.name,
        quantity: selections[unit.id] || 0,
        cost_per_unit: unit.cost_per_unit / 100,
      }));

      const selections_data = {
        items: selectionDetails,
        estimated_total: estimatedTotal,
      };

      const { error: submitError } = await supabase.from('quote_submissions').insert([
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          selections: selections_data,
          estimated_total: Math.round(estimatedTotal * 100),
          message: formData.message,
        },
      ]);

      if (submitError) throw submitError;

      await fetch('/api/send-quote-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          selections: selectionDetails,
          estimated_total: estimatedTotal,
        }),
      });

      setSubmitted(true);
      setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', company: '', message: '' });
        setSubmitted(false);
      }, 4000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit quote request';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!units.length) {
    return (
      <div className="text-center py-12">
        <p style={{ color: 'rgba(21,34,50,0.6)' }}>Pricing units not configured yet.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl p-8 bg-white shadow-lg relative" style={{ zIndex: 20 }}>
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto" style={{ background: 'rgba(94,188,103,0.12)' }}>
            <svg className="w-8 h-8" style={{ color: '#5EBC67' }} fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: '#152232' }}>
            Quote Request Received!
          </h3>
          <p className="mb-4" style={{ color: 'rgba(21,34,50,0.6)' }}>
            Your first-look estimate is <span className="font-semibold text-xl" style={{ color: '#39CCCC' }}>${estimatedTotal.toFixed(2)}</span>
          </p>
          <p style={{ color: 'rgba(21,34,50,0.6)' }}>
            We'll review your request and reach out with a customized quote shortly.
          </p>
        </div>
      </div>
    );
  }

  const inputClass = 'w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors';
  const inputStyle = { background: 'white', border: '1.5px solid rgba(21,34,50,0.12)', color: '#152232' };

  return (
    <div className="rounded-2xl p-4 sm:p-6 bg-white shadow-lg relative" style={{ zIndex: 20 }}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pricing Options */}
        <div>
          <h3 className="text-base font-semibold mb-4" style={{ color: '#152232' }}>
            Select Your Options
          </h3>
          <div className="grid md:grid-cols-2 gap-3 mb-5">
            {units.map((unit) => (
              <div key={unit.id} className="p-3 rounded-lg" style={{ background: 'rgba(57,204,204,0.05)', border: '1px solid rgba(57,204,204,0.15)' }}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-semibold text-sm" style={{ color: '#152232' }}>
                      {unit.name}
                    </h4>
                    {unit.description && (
                      <p className="text-xs mt-0.5" style={{ color: 'rgba(21,34,50,0.6)' }}>
                        {unit.description}
                      </p>
                    )}
                  </div>
                  <span style={{ color: '#39CCCC' }} className="font-semibold text-sm">
                    ${(unit.cost_per_unit / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(unit.id, (selections[unit.id] || 0) - 1)}
                    className="px-2 py-0.5 rounded border hover:bg-gray-100 transition-colors text-sm"
                    style={{ borderColor: 'rgba(21,34,50,0.12)' }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    value={selections[unit.id] || 0}
                    onChange={(e) => handleQuantityChange(unit.id, parseInt(e.target.value) || 0)}
                    min={unit.min_quantity}
                    max={unit.max_quantity}
                    className="w-14 text-center rounded px-2 py-0.5 text-sm"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => handleQuantityChange(unit.id, (selections[unit.id] || 0) + 1)}
                    className="px-2 py-0.5 rounded border hover:bg-gray-100 transition-colors text-sm"
                    style={{ borderColor: 'rgba(21,34,50,0.12)' }}
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Estimated Total */}
          <div
            className="p-4 rounded-lg mb-5 text-center"
            style={{ background: 'rgba(57,204,204,0.1)', border: '2px solid rgba(57,204,204,0.3)' }}
          >
            <p className="text-xs mb-1" style={{ color: 'rgba(21,34,50,0.6)' }}>
              Your First-Look Estimate
            </p>
            <p className="text-3xl font-bold" style={{ color: '#39CCCC' }}>
              ${estimatedTotal.toFixed(2)}
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(21,34,50,0.6)' }}>
              Final pricing may vary based on your specific needs
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="border-t pt-4">
          <h3 className="text-base font-semibold mb-4" style={{ color: '#152232' }}>
            Tell Us About Yourself
          </h3>
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(21,34,50,0.75)' }}>
                Full Name <span style={{ color: '#39CCCC' }}>*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                required
                placeholder="John Smith"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(21,34,50,0.75)' }}>
                Email <span style={{ color: '#39CCCC' }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                required
                placeholder="john@company.com"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(21,34,50,0.75)' }}>
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                placeholder="(954) 555-0100"
                className={inputClass}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(21,34,50,0.75)' }}>
                Company Name
              </label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleFormChange}
                placeholder="Acme Corp"
                className={inputClass}
                style={inputStyle}
              />
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1" style={{ color: 'rgba(21,34,50,0.75)' }}>
              Additional Details
            </label>
            <textarea
              name="message"
              value={formData.message}
              onChange={handleFormChange}
              rows={3}
              placeholder="Tell us about your specific needs..."
              className={`${inputClass} resize-none`}
              style={inputStyle}
            />
          </div>

          {error && <p className="text-sm mb-3" style={{ color: '#e05252' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5"
            style={{ background: '#39CCCC', boxShadow: '0 4px 12px rgba(57,204,204,0.3)' }}
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
                Get Your Quote
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
