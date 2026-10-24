import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import SocialEngineeringGroundswellMetricPage from './pages/SocialEngineeringGroundswellMetricPage';
import SocialEngineeringGroundswellPage from './pages/SocialEngineeringGroundswellPage';
import { DIVISION_GROUNDSWELL_PATH, GROUNDSWELL_METRIC_SLUGS, groundswellMetricPath, type GroundswellMetricSlug } from './site';

/** The GroundSwell page and its metric pages: the URLs whose body is prerendered. */
export function isGroundswellPublicPath(pagePath: string): boolean {
  return pagePath === DIVISION_GROUNDSWELL_PATH || GROUNDSWELL_METRIC_SLUGS.some((slug) => groundswellMetricPath(slug) === pagePath);
}

/**
 * Build-only entry, loaded through Vite's SSR module loader so the real page's
 * CSS and TSX imports use the same pipeline as the browser build. Rendering the
 * actual component keeps crawlable content, links, FAQs, and artwork in sync.
 * Without a path it renders the GroundSwell page; a metric page's path renders
 * that page.
 */
export function renderGroundswellBody(pagePath: string = DIVISION_GROUNDSWELL_PATH): string {
  const slug = GROUNDSWELL_METRIC_SLUGS.find((candidate) => groundswellMetricPath(candidate) === pagePath) as GroundswellMetricSlug | undefined;
  if (pagePath !== DIVISION_GROUNDSWELL_PATH && !slug) throw new Error(`No GroundSwell body is rendered for ${pagePath}.`);
  return renderToString(
    <StaticRouter location={pagePath}>
      {slug ? <SocialEngineeringGroundswellMetricPage slug={slug} /> : <SocialEngineeringGroundswellPage />}
    </StaticRouter>,
  );
}
