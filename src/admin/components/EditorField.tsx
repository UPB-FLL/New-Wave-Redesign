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
  const inputClass = "w-full px-4 py-2.5 rounded-lg text-sm text-white placeholder-white/30 outline-none transition-colors focus:ring-2 focus:ring-teal-500/50 focus:border-transparent bg-white/5 border border-white/10 hover:bg-white/7.5";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-white/80">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
      {hint && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  );
}
