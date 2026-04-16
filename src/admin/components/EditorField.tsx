interface EditorFieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  rows?: number;
  hint?: string;
}

export default function EditorField({ label, value, onChange, multiline = false, rows = 3, hint }: EditorFieldProps) {
  const baseClass = "w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all resize-none";
  const baseStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' };

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</label>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          style={baseStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(57,204,204,0.5)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
          style={baseStyle}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(57,204,204,0.5)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />
      )}
      {hint && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{hint}</p>}
    </div>
  );
}
