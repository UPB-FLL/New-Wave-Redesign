import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { NwseIcon } from '../icons/NwseIcon';

export interface TabItem {
  /** Stable key; part of the tab's and panel's ids. */
  id: string;
  /** The tab's plain name: the Next button says "Next: <title>". */
  title: string;
  /** What the tab shows, when it is more than the title (a tile and the title, for example). */
  label?: ReactNode;
  panel: ReactNode;
}

/** The division's tab styles (division.css, .nwse-tab-*). */
export type TabLook = 'chips' | 'steps' | 'dark';

const KEY_MOVES: Record<string, number | 'home' | 'end'> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
  Home: 'home',
  End: 'end',
};

/**
 * Tabs, to the WAI-ARIA pattern: a row of tab buttons with a roving tabindex
 * (Left, Right, Home, and End move and select) and one panel per tab. The
 * inactive panels stay in the DOM under the hidden attribute, so their text is
 * there to search, print, and index. Three looks (division.css): `chips`,
 * pills that scroll sideways on phones; `steps`, the marker tiles and labels
 * of a stepper; `dark`, text with an amber underline on a navy frame. With
 * `guided`, Back and Next buttons under the panel walk the tabs in order, and
 * `finish` takes Next's place on the last one (a call to action, usually).
 * `header` renders above the row, inside the same frame as the tabs
 * (`headClassName`); the panels sit in `bodyClassName`.
 */
export function Tabs({
  items,
  label,
  look = 'chips',
  guided = false,
  finish,
  nextLabel = 'Next',
  backLabel = 'Back',
  header,
  headClassName = '',
  bodyClassName = '',
  className = '',
  onChange,
}: {
  items: readonly TabItem[];
  /** The tab row's accessible name. */
  label: string;
  look?: TabLook;
  guided?: boolean;
  finish?: ReactNode;
  nextLabel?: string;
  backLabel?: string;
  header?: ReactNode;
  headClassName?: string;
  bodyClassName?: string;
  className?: string;
  onChange?: (index: number) => void;
}) {
  const baseId = useId();
  const [index, setIndex] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (next: number, focus = false) => {
    const bounded = Math.min(Math.max(next, 0), items.length - 1);
    setIndex(bounded);
    onChange?.(bounded);
    if (focus) tabs.current[bounded]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const move = KEY_MOVES[event.key];
    if (move === undefined) return;
    event.preventDefault();
    if (move === 'home') select(0, true);
    else if (move === 'end') select(items.length - 1, true);
    else select((index + move + items.length) % items.length, true);
  };

  const tabId = (item: TabItem) => `${baseId}-tab-${item.id}`;
  const panelId = (item: TabItem) => `${baseId}-panel-${item.id}`;
  const last = index === items.length - 1;

  return (
    <div className={`nwse-tabs ${className}`.trim()} data-look={look}>
      <div className={headClassName}>
        {header}
        <div role="tablist" aria-label={label} className="nwse-tablist">
          {items.map((item, i) => (
            <button
              key={item.id}
              ref={(element) => {
                tabs.current[i] = element;
              }}
              type="button"
              role="tab"
              id={tabId(item)}
              aria-selected={i === index}
              aria-controls={panelId(item)}
              tabIndex={i === index ? 0 : -1}
              className={`nwse-tab nwse-tab-${look === 'chips' ? 'chip' : look}${look === 'chips' ? ' nwse-chip' : ''}`}
              onClick={() => select(i)}
              onKeyDown={onKeyDown}
            >
              {item.label ?? item.title}
            </button>
          ))}
        </div>
      </div>
      <div className={bodyClassName}>
        {items.map((item, i) => (
          <div key={item.id} role="tabpanel" id={panelId(item)} aria-labelledby={tabId(item)} hidden={i !== index} className="nwse-tabpanel">
            {item.panel}
          </div>
        ))}
        {guided ? (
          <div className="nwse-tabnav mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 sm:mt-8 sm:pt-5" style={{ borderColor: 'var(--nw-mist-gray)' }}>
            <button type="button" className="nwse-btn nwse-btn-ghost" onClick={() => select(index - 1, true)} disabled={index === 0}>
              <NwseIcon name="chevron-right" size={16} className="rotate-180" />
              {backLabel}
            </button>
            {last && finish ? (
              finish
            ) : (
              <button type="button" className="nwse-btn nwse-btn-navy" onClick={() => select(index + 1, true)} disabled={last}>
                {/* One text node, so the button's gap does not open before the colon. */}
                <span>
                  {nextLabel}
                  {!last ? <span className="font-normal">: {items[index + 1].title}</span> : null}
                </span>
                <NwseIcon name="chevron-right" size={16} />
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
