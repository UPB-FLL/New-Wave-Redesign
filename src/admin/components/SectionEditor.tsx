import { ReactNode, useState } from 'react';
import { CheckCircle, AlertCircle, Save } from 'lucide-react';

interface SectionEditorProps {
  title: string;
  description?: string;
  onSave: () => Promise<void>;
  children: ReactNode;
}

export default function SectionEditor({ title, description, onSave, children }: SectionEditorProps) {
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setSaving(true);
    setStatus('idle');
    try {
      await onSave();
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
          {description && <p className="text-sm text-white/60">{description}</p>}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white transition-all duration-200 flex-shrink-0 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-600/50 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-300">
          <CheckCircle size={16} />
          Changes saved successfully
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-sm text-red-300">
          <AlertCircle size={16} />
          Error saving changes
        </div>
      )}

      <div className="space-y-6">{children}</div>
    </div>
  );
}
