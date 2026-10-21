import type { ReactNode } from 'react';
import { ChevronRight, Pin } from 'lucide-react';

/**
 * One block of a section (Headline, Buttons, Feature cards), collapsed by
 * default: title, a one-line preview of its main text, a field count, and
 * an amber dot while it holds unsaved edits. Opening one closes the others
 * unless they are pinned.
 */
interface BlockCardProps {
  id: string;
  title: string;
  description?: string;
  preview?: string;
  fieldCount: number;
  edited: boolean;
  open: boolean;
  pinned: boolean;
  onToggle: () => void;
  onPin: () => void;
  children: ReactNode;
}

export default function BlockCard({ id, title, description, preview, fieldCount, edited, open, pinned, onToggle, onPin, children }: BlockCardProps) {
  const bodyId = `block-${id}`;
  return (
    <section
      className="rounded-xl"
      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${open ? 'rgba(57,204,204,0.3)' : 'rgba(255,255,255,0.08)'}` }}
      aria-labelledby={`${bodyId}-title`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex-1 min-w-0 flex items-center gap-3 text-left"
        >
          <ChevronRight size={16} className={`flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span id={`${bodyId}-title`} className="text-sm font-semibold text-white">{title}</span>
              {edited && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" aria-label="unsaved changes" />}
              <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                {fieldCount} {fieldCount === 1 ? 'field' : 'fields'}
              </span>
            </span>
            {!open && preview && <span className="block text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{preview}</span>}
            {open && description && <span className="block text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{description}</span>}
          </span>
        </button>
        {open && (
          <button
            type="button"
            onClick={onPin}
            aria-pressed={pinned}
            aria-label={pinned ? `Unpin ${title}` : `Keep ${title} open`}
            title={pinned ? 'Unpin' : 'Keep open when another block opens'}
            className={`p-1.5 rounded ${pinned ? 'text-teal-300 bg-teal-500/15' : 'text-white/30 hover:text-white hover:bg-white/10'}`}
          >
            <Pin size={14} />
          </button>
        )}
      </div>
      {open && (
        <div id={bodyId} className="px-4 pb-5 pt-1 space-y-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {children}
        </div>
      )}
    </section>
  );
}
