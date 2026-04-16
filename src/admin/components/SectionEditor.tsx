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
    <div>
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">{title}</h1>
          {description && <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>{description}</p>}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {status === 'success' && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: '#5EBC67' }}>
              <CheckCircle size={15} /> Saved
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1.5 text-sm" style={{ color: '#f87171' }}>
              <AlertCircle size={15} /> Error saving
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200"
            style={{ background: saving ? 'rgba(57,204,204,0.5)' : '#39CCCC' }}
          >
            <Save size={15} />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-5">{children}</div>
    </div>
  );
}
