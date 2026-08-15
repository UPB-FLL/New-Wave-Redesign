import { CheckCircle2, Minus, Plus, Send } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface PricingUnit {
  id: string;
  name: string;
  description: string;
  cost_per_unit: number;
  min_quantity: number;
  max_quantity: number;
}

export default function DynamicPricingBuilder() {
  const [units, setUnits] = useState<PricingUnit[]>([]);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [estimatedTotal, setEstimatedTotal] = useState(0);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchPricingUnits();
  }, []);

  useEffect(() => {
    const total = units.reduce((sum, unit) => sum + (unit.cost_per_unit / 100) * (selections[unit.id] || 0), 0);
    setEstimatedTotal(total);
  }, [selections, units]);

  const fetchPricingUnits = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('pricing_units')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (fetchError) throw fetchError;
      const pricingUnits = (data ?? []) as PricingUnit[];
      setUnits(pricingUnits);
      setSelections(Object.fromEntries(pricingUnits.map((unit) => [unit.id, 0])));
    } catch (fetchError) {
      console.error('Failed to fetch pricing units:', fetchError);
    }
  };

  const handleQuantityChange = (unitId: string, quantity: number) => {
    const unit = units.find((item) => item.id === unitId);
    if (!unit) return;

    const nextQuantity = Math.max(0, Math.min(unit.max_quantity, quantity));
    setSelections((previous) => ({ ...previous, [unitId]: nextQuantity }));
  };

  const handleFormChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((previous) => ({ ...previous, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!formData.name || !formData.email) {
      setError('Name and email are required.');
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
      const selectionsData = { items: selectionDetails, estimated_total: estimatedTotal };

      const { error: submitError } = await supabase.from('quote_submissions').insert([
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          company: formData.company,
          selections: selectionsData,
          estimated_total: Math.round(estimatedTotal * 100),
          message: formData.message,
        },
      ]);

      if (submitError) throw submitError;

      await fetch('/api/send-quote-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, selections: selectionDetails, estimated_total: estimatedTotal }),
      });

      setSubmitted(true);
      window.setTimeout(() => {
        setFormData({ name: '', email: '', phone: '', company: '', message: '' });
        setSubmitted(false);
      }, 4000);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to submit quote request.');
    } finally {
      setLoading(false);
    }
  };

  if (!units.length) {
    return <p className="py-12 text-center text-[var(--nw-slate)]">Pricing units are not configured yet.</p>;
  }

  if (submitted) {
    return (
      <section className="nw-surface rounded-lg p-8 text-center" aria-live="polite">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--nw-continuity-green)_16%,transparent)] text-[var(--nw-continuity-green)]">
          <CheckCircle2 size={28} aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-bold text-[var(--nw-current-navy)]">Quote request received</h2>
        <p className="mt-3 text-[var(--nw-slate)]">Your first-look estimate is <strong className="text-[var(--nw-tide-blue)]">${estimatedTotal.toFixed(2)}</strong>.</p>
        <p className="mt-2 text-sm text-[var(--nw-slate)]">We will review your request and follow up with a customized quote.</p>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="nw-surface rounded-lg p-4 sm:p-6">
      <section aria-labelledby="pricing-options-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="nw-kicker text-[var(--nw-tide-blue)]">Build Your Estimate</p>
            <h2 id="pricing-options-title" className="mt-2 text-lg font-bold text-[var(--nw-current-navy)]">Select your options</h2>
          </div>
          <p className="text-sm text-[var(--nw-slate)]">Adjust quantities to suit your team.</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {units.map((unit) => {
            const quantity = selections[unit.id] || 0;
            const quantityId = `quantity-${unit.id}`;
            return (
              <article key={unit.id} className="rounded-md border p-4" style={{ background: 'var(--nw-cloud-white)', borderColor: 'var(--nw-mist-gray)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-[var(--nw-current-navy)]">{unit.name}</h3>
                    {unit.description ? <p className="mt-1 text-sm leading-relaxed text-[var(--nw-slate)]">{unit.description}</p> : null}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-[var(--nw-tide-blue)]">${(unit.cost_per_unit / 100).toFixed(2)}</span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button type="button" onClick={() => handleQuantityChange(unit.id, quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-md border text-[var(--nw-current-navy)] transition-colors hover:border-[var(--nw-tide-blue)]" style={{ borderColor: 'var(--nw-mist-gray)' }} aria-label={`Decrease ${unit.name} quantity`} title="Decrease quantity"><Minus size={16} aria-hidden="true" /></button>
                  <label htmlFor={quantityId} className="sr-only">{unit.name} quantity</label>
                  <input id={quantityId} type="number" value={quantity} onChange={(event) => handleQuantityChange(unit.id, Number.parseInt(event.target.value, 10) || 0)} min={unit.min_quantity} max={unit.max_quantity} className="input-light h-9 w-16 px-2 py-0 text-center" />
                  <button type="button" onClick={() => handleQuantityChange(unit.id, quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-md border text-[var(--nw-current-navy)] transition-colors hover:border-[var(--nw-tide-blue)]" style={{ borderColor: 'var(--nw-mist-gray)' }} aria-label={`Increase ${unit.name} quantity`} title="Increase quantity"><Plus size={16} aria-hidden="true" /></button>
                </div>
              </article>
            );
          })}
        </div>
        <div className="mt-5 rounded-md border p-5 text-center" style={{ background: 'var(--nw-current-navy)', borderColor: 'var(--nw-tide-blue)' }}>
          <p className="nw-meta text-xs text-[var(--nw-mist-gray)]">Your First-Look Estimate</p>
          <p className="nw-display mt-2 text-4xl text-[var(--nw-signal-cyan)]">${estimatedTotal.toFixed(2)}</p>
          <p className="mt-2 text-xs text-[var(--nw-mist-gray)]">Final pricing may vary based on your specific needs.</p>
        </div>
      </section>

      <section className="mt-8 border-t pt-6" style={{ borderColor: 'var(--nw-mist-gray)' }} aria-labelledby="quote-contact-title">
        <p className="nw-kicker text-[var(--nw-tide-blue)]">Contact Details</p>
        <h2 id="quote-contact-title" className="mt-2 text-lg font-bold text-[var(--nw-current-navy)]">Tell us about your organization</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div><label htmlFor="quote-name" className="mb-1.5 block text-sm font-medium text-[var(--nw-current-navy)]">Full name <span className="text-[var(--nw-tide-blue)]">*</span></label><input id="quote-name" type="text" name="name" value={formData.name} onChange={handleFormChange} required placeholder="John Smith" className="input-light" /></div>
          <div><label htmlFor="quote-email" className="mb-1.5 block text-sm font-medium text-[var(--nw-current-navy)]">Email <span className="text-[var(--nw-tide-blue)]">*</span></label><input id="quote-email" type="email" name="email" value={formData.email} onChange={handleFormChange} required placeholder="john@company.com" className="input-light" /></div>
          <div><label htmlFor="quote-phone" className="mb-1.5 block text-sm font-medium text-[var(--nw-current-navy)]">Phone number</label><input id="quote-phone" type="tel" name="phone" value={formData.phone} onChange={handleFormChange} placeholder="(954) 555-0100" className="input-light" /></div>
          <div><label htmlFor="quote-company" className="mb-1.5 block text-sm font-medium text-[var(--nw-current-navy)]">Company name</label><input id="quote-company" type="text" name="company" value={formData.company} onChange={handleFormChange} placeholder="Acme Corp" className="input-light" /></div>
        </div>
        <div className="mt-4"><label htmlFor="quote-message" className="mb-1.5 block text-sm font-medium text-[var(--nw-current-navy)]">Additional details</label><textarea id="quote-message" name="message" value={formData.message} onChange={handleFormChange} rows={4} placeholder="Tell us about your specific needs..." className="input-light resize-y" /></div>
        {error ? <p className="mt-4 text-sm text-red-700" role="alert">{error}</p> : null}
        <button type="submit" disabled={loading} className="btn-primary mt-6 w-full disabled:cursor-not-allowed disabled:opacity-60">
          {loading ? 'Sending...' : <><Send size={17} aria-hidden="true" />Get Your Quote</>}
        </button>
      </section>
    </form>
  );
}
