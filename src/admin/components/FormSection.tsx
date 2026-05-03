import { ReactNode } from 'react';

interface FormSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function FormSection({ title, subtitle, children }: FormSectionProps) {
  return (
    <div className="space-y-4 p-6 rounded-xl bg-white/5 border border-white/10">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-sm text-white/50 mt-1">{subtitle}</p>}
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}
