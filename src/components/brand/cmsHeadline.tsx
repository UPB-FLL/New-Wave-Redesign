import type { ReactNode } from 'react';

/**
 * A section's CMS headline, with its accent when the CMS sets one, or the
 * code's own title when the CMS has no headline. The default title is never
 * mixed into a CMS headline: that is how "…trusted IT partner" came out
 * "…trusted IT partner trusted IT partner".
 */
export function cmsHeadline(content: Record<string, string | undefined>, fallback: ReactNode): ReactNode {
  if (!content.headline) return fallback;
  if (!content.headline_accent) return content.headline;
  return (
    <>
      {content.headline} <span className="text-[var(--nw-tide-blue)]">{content.headline_accent}</span>
    </>
  );
}
