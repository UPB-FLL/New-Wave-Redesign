import { useState } from 'react';
import { exitPreview, isPreviewMode } from '../lib/preview';

/**
 * The bar across the top of a page opened from the admin's "View on site":
 * says the page is showing unsaved edits, links back to the editor, and
 * lets the viewer leave preview. Renders nothing in a normal tab.
 */
export default function PreviewBanner() {
  const [on, setOn] = useState(() => isPreviewMode());
  if (!on) return null;
  const exit = () => {
    exitPreview();
    setOn(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('preview');
    window.location.replace(url.toString());
  };
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[1000] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-sm font-medium"
      style={{ background: '#f59e0b', color: '#1a1a1a', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}
    >
      <span>Preview: showing your unsaved admin edits. Nothing here is live until you save.</span>
      <a href="/admin" className="underline">Back to the editor</a>
      <button type="button" onClick={exit} className="underline">Exit preview</button>
    </div>
  );
}
