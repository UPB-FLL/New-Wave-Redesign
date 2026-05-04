interface EditorFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
  type?: string;
}

export default function EditorField({ label, value, onChange, multiline = false, rows = 3, hint, type = 'text' }: EditorFieldProps) {
  const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.7)';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(94, 188, 103, 0.1)';
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = 'rgba(94, 188, 103, 0.3)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/80">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-2 resize-none"
          style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-all focus:ring-2"
          style={{ background: 'rgba(26, 47, 63, 0.6)', border: '1px solid rgba(94, 188, 103, 0.3)' }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )}
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}
