import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import SocialEngineeringGroundswellPage from './pages/SocialEngineeringGroundswellPage';
import { DIVISION_GROUNDSWELL_PATH } from './site';

/**
 * Build-only entry, loaded through Vite's SSR module loader so the real page's
 * CSS and TSX imports use the same pipeline as the browser build. Rendering the
 * actual component keeps crawlable content, links, FAQs, and artwork in sync.
 */
export function renderGroundswellBody(): string {
  return renderToString(
    <StaticRouter location={DIVISION_GROUNDSWELL_PATH}>
      <SocialEngineeringGroundswellPage />
    </StaticRouter>,
  );
}
