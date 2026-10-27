import { CheckCircle2 } from 'lucide-react';

type CheckListProps = {
  items: readonly string[];
  /** Two columns from the md breakpoint. */
  columns?: 1 | 2;
  /** Numbers the items instead of checking them, for steps taken in order. */
  ordered?: boolean;
  /** Smaller text, for lists inside a card. */
  dense?: boolean;
  className?: string;
};

/** A plain list of short points: a check (or a step number) and the text, no chips. */
export function CheckList({ items, columns = 1, ordered = false, dense = false, className = '' }: CheckListProps) {
  const List = ordered ? 'ol' : 'ul';
  return (
    <List className={`grid gap-x-8 ${dense ? 'gap-y-2.5' : 'gap-y-3'} ${columns === 2 ? 'md:grid-cols-2' : ''} ${className}`} style={{ borderColor: 'var(--nw-mist-gray)' }}>
      {items.map((item, index) => (
        <li key={item} className={`flex items-start gap-3 leading-relaxed text-[var(--nw-current-navy)] ${dense ? 'text-sm' : 'text-base'}`}>
          {ordered ? (
            <span className="nw-display mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs text-[var(--nw-deep-current)]" style={{ background: 'var(--nw-signal-cyan)' }} aria-hidden="true">
              {index + 1}
            </span>
          ) : (
            <CheckCircle2 size={dense ? 16 : 18} className={`${dense ? 'mt-0.5' : 'mt-1'} shrink-0 text-[var(--nw-continuity-green)]`} aria-hidden="true" />
          )}
          <span>{item}</span>
        </li>
      ))}
    </List>
  );
}
