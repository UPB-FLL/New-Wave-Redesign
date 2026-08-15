import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const navLinks = [
  { label: 'Program', href: '#program' },
  { label: 'Contact', href: '/contact' },
];

function CodeNestMark() {
  return <a href="#top" className="font-bold text-[var(--nw-cloud-white)]" aria-label="CodeNest home">Code<span className="text-[var(--nw-signal-cyan)]">Nest</span></a>;
}

export default function CodeNestNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <header className="absolute inset-x-0 top-0 z-40">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <CodeNestMark />
        <div className="hidden items-center gap-7 md:flex">{navLinks.map((link) => <a key={link.href} href={link.href} className="text-sm font-semibold text-[var(--nw-mist-gray)] transition-colors hover:text-[var(--nw-signal-cyan)]">{link.label}</a>)}</div>
        <button type="button" className="text-[var(--nw-cloud-white)] md:hidden" onClick={() => setOpen(true)} aria-label="Open CodeNest menu" aria-expanded={open} aria-controls="codenest-mobile-menu" title="Open navigation"><Menu size={24} aria-hidden="true" /></button>
      </nav>
      {open ? <div id="codenest-mobile-menu" className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--nw-deep-current)' }} role="dialog" aria-modal="true"><div className="flex items-center justify-between px-6 py-6"><CodeNestMark /><button type="button" className="text-[var(--nw-cloud-white)]" onClick={() => setOpen(false)} aria-label="Close CodeNest menu" title="Close navigation"><X size={24} aria-hidden="true" /></button></div><div className="flex flex-1 flex-col items-center justify-center gap-8">{navLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-2xl font-bold text-[var(--nw-cloud-white)] transition-colors hover:text-[var(--nw-signal-cyan)]">{link.label}</a>)}</div></div> : null}
    </header>
  );
}
