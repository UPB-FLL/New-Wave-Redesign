/* eslint-disable react-refresh/only-export-components -- build-only module, never hot-reloaded */
import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import TrustBar from '../components/TrustBar';
import Services from '../components/Services';
import WhyUs from '../components/WhyUs';
import AreasWeServe from '../components/AreasWeServe';
import Footer from '../components/Footer';
import AboutPage from '../pages/AboutPage';
import BlogPage from '../pages/BlogPage';
import CellularDASPublicSafetyServicePage from '../pages/CellularDASPublicSafetyServicePage';
import CloudSolutionsServicePage from '../pages/CloudSolutionsServicePage';
import CodeNestPage from '../pages/CodeNestPage';
import ContactPage from '../pages/ContactPage';
import CookiePolicyPage from '../pages/CookiePolicyPage';
import CybersecurityPage from '../pages/CybersecurityPage';
import CybersecurityServicePage from '../pages/CybersecurityServicePage';
import FamilyOfficesServicePage from '../pages/FamilyOfficesServicePage';
import HealthcareServicePage from '../pages/HealthcareServicePage';
import ITRepairServicePage from '../pages/ITRepairServicePage';
import ITSupportBocaRatonPage from '../pages/ITSupportBocaRatonPage';
import ITSupportFortLauderdalePage from '../pages/ITSupportFortLauderdalePage';
import LiveITSupportServicePage from '../pages/LiveITSupportServicePage';
import LuxuryServicePage from '../pages/LuxuryServicePage';
import ManagedITFortLauderdalePage from '../pages/ManagedITFortLauderdalePage';
import ManagedITMiamiPage from '../pages/ManagedITMiamiPage';
import ManagedITServicePage from '../pages/ManagedITServicePage';
import ManagedITWestPalmBeachPage from '../pages/ManagedITWestPalmBeachPage';
import NetworkInfrastructureServicePage from '../pages/NetworkInfrastructureServicePage';
import PricingPage from '../pages/PricingPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import ServiceGuidePage from '../pages/ServiceGuidePage';
import ServicesPage from '../pages/ServicesPage';
import SouthFloridaServiceAreasPage from '../pages/SouthFloridaServiceAreasPage';
import StatusPage from '../pages/StatusPage';
import SupportPage from '../pages/SupportPage';
import TermsAndConditionsPage from '../pages/TermsAndConditionsPage';
import WhyUsPage from '../pages/WhyUsPage';
import { seedContentCache, type ContentMap } from './content';
import { beginJsonLdCapture, endJsonLdCapture } from './jsonLdCapture';
import { seedPricingUnits, type PricingUnit } from './pricingUnits';
import { HOME_PAGE_JSON_LD, HOME_PAGE_META } from './routeMeta';
import { serviceGuidePath } from './serviceGuides';
import { usePageMeta } from './usePageMeta';

/** The homepage as App.tsx composes it (HomePage is not exported from App), with the same usePageMeta call. */
function HomeBody() {
  usePageMeta({ ...HOME_PAGE_META, jsonLd: HOME_PAGE_JSON_LD });
  return (
    <div className="min-h-screen relative bg-[var(--nw-cloud-white)]">
      <Navbar />
      <Hero />
      <TrustBar />
      <Services />
      <WhyUs />
      <AreasWeServe />
      <Footer />
    </div>
  );
}

/**
 * Every static New Wave IT route and the element App.tsx mounts for it. Kept
 * beside the route table so a page added to App.tsx without a row here is a
 * test failure, not a silent shell.
 */
const IT_ROUTE_ELEMENTS: Record<string, ReactElement> = {
  '/': <HomeBody />,
  '/codenest': <CodeNestPage />,
  '/contact': <ContactPage />,
  '/terms-and-conditions': <TermsAndConditionsPage />,
  '/privacy-policy': <PrivacyPolicyPage />,
  '/cookie-policy': <CookiePolicyPage />,
  '/cybersecurity': <CybersecurityPage />,
  '/why-us': <WhyUsPage />,
  '/about': <AboutPage />,
  '/services': <ServicesPage />,
  '/blog': <BlogPage />,
  '/pricing': <PricingPage />,
  '/support': <SupportPage />,
  '/service-category/cybersecurity': <CybersecurityServicePage />,
  '/service-category/live-it-support': <LiveITSupportServicePage />,
  '/service-category/it-repair-upgrades': <ITRepairServicePage />,
  '/service-category/managed-it-services': <ManagedITServicePage />,
  '/service-category/cloud-solutions': <CloudSolutionsServicePage />,
  '/service-category/network-infrastructure': <NetworkInfrastructureServicePage />,
  '/service-category/family-offices': <FamilyOfficesServicePage />,
  '/service-category/healthcare': <HealthcareServicePage />,
  '/it-support-fort-lauderdale': <ITSupportFortLauderdalePage />,
  '/managed-it-services-fort-lauderdale': <ManagedITFortLauderdalePage />,
  '/managed-it-services-miami': <ManagedITMiamiPage />,
  '/it-support-boca-raton': <ITSupportBocaRatonPage />,
  '/managed-it-services-west-palm-beach': <ManagedITWestPalmBeachPage />,
  '/managed-it-services-south-florida': <SouthFloridaServiceAreasPage />,
  '/service-category/luxury': <LuxuryServicePage />,
  '/service-category/cellular-das-and-public-safety': <CellularDASPublicSafetyServicePage />,
  // The owner's call (2026-10-27): /status links each provider's own status
  // page and states no figures of its own, so it is written in like the rest.
  '/status': <StatusPage />,
  // /groundswell (the partner sign-in) is a lazy chunk and keeps the shell.
};

const GUIDE_PATTERN = '/l/:slug';

/** The route pattern App.tsx matches `pagePath` with, or undefined when no static page renders there. */
function routePattern(pagePath: string): string | undefined {
  if (pagePath in IT_ROUTE_ELEMENTS) return pagePath;
  if (pagePath.startsWith(serviceGuidePath(''))) return GUIDE_PATTERN;
  return undefined;
}

export function isPrerenderedItPath(pagePath: string): boolean {
  return routePattern(pagePath) !== undefined;
}

/**
 * Build-only entry, loaded through Vite's SSR module loader (vite.config.ts),
 * never by the browser. Renders the real page component for `pagePath` at
 * that URL, so the static HTML carries the page's own copy, links and FAQs.
 * `content` is the CMS read at build time (section → key → value); the hooks
 * start from it, as they would from a warm cache in the browser. Without it
 * every component renders its code fallback. `pricingUnits` is the price list
 * read the same way (the pricing_units rows); /pricing renders its table from
 * it, and without it renders no prices at all.
 */
export function renderItBody(
  pagePath: string,
  content: Record<string, ContentMap> | null = null,
  pricingUnits: readonly PricingUnit[] | null = null,
): string {
  const pattern = routePattern(pagePath);
  if (!pattern) throw new Error(`No New Wave IT body is rendered for ${pagePath}.`);
  const element = pattern === GUIDE_PATTERN ? <ServiceGuidePage /> : IT_ROUTE_ELEMENTS[pattern];
  seedContentCache(content);
  seedPricingUnits(pricingUnits);
  try {
    return renderToString(
      <StaticRouter location={pagePath}>
        <Routes>
          <Route path={pattern} element={element} />
        </Routes>
      </StaticRouter>,
    );
  } finally {
    seedContentCache(null);
    seedPricingUnits(null);
  }
}

/** One page as the build writes it. The shape fits renderRouteHtml's options (src/lib/prerenderHead.ts). */
export interface RenderedItPage {
  /** The page's markup, as renderItBody returns it. */
  bodyHtml: string;
  /** What the page passed to usePageMeta as `jsonLd`, as an array; null when it passed none. */
  jsonLd: object[] | null;
}

/**
 * renderItBody plus the page's own JSON-LD. usePageMeta writes JSON-LD in an
 * effect, which a build render never runs, so the page's Service, FAQPage or
 * Article node is captured while it renders (src/lib/jsonLdCapture.ts) and
 * goes into the raw HTML beside the body.
 */
export function renderItPage(
  pagePath: string,
  content: Record<string, ContentMap> | null = null,
  pricingUnits: readonly PricingUnit[] | null = null,
): RenderedItPage {
  beginJsonLdCapture();
  try {
    const bodyHtml = renderItBody(pagePath, content, pricingUnits);
    return { bodyHtml, jsonLd: endJsonLdCapture() };
  } finally {
    // A page that throws must not leave its capture open for the next render.
    endJsonLdCapture();
  }
}
