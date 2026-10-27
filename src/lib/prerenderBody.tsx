/* eslint-disable react-refresh/only-export-components -- build-only module, never hot-reloaded */
import { renderToString } from 'react-dom/server';
import { Route, Routes, StaticRouter } from 'react-router-dom';
import type { ReactElement } from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import TrustBar from '../components/TrustBar';
import Services from '../components/Services';
import WhyUs from '../components/WhyUs';
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
import ITSupportFortLauderdalePage from '../pages/ITSupportFortLauderdalePage';
import LiveITSupportServicePage from '../pages/LiveITSupportServicePage';
import LuxuryServicePage from '../pages/LuxuryServicePage';
import ManagedITFortLauderdalePage from '../pages/ManagedITFortLauderdalePage';
import ManagedITServicePage from '../pages/ManagedITServicePage';
import NetworkInfrastructureServicePage from '../pages/NetworkInfrastructureServicePage';
import PricingPage from '../pages/PricingPage';
import PrivacyPolicyPage from '../pages/PrivacyPolicyPage';
import ServiceGuidePage from '../pages/ServiceGuidePage';
import ServicesPage from '../pages/ServicesPage';
import SupportPage from '../pages/SupportPage';
import TermsAndConditionsPage from '../pages/TermsAndConditionsPage';
import WhyUsPage from '../pages/WhyUsPage';
import { seedContentCache, type ContentMap } from './content';
import { serviceGuidePath } from './serviceGuides';

/** The homepage as App.tsx composes it (HomePage is not exported from App). */
function HomeBody() {
  return (
    <div className="min-h-screen relative bg-[var(--nw-cloud-white)]">
      <Navbar />
      <Hero />
      <TrustBar />
      <Services />
      <WhyUs />
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
  '/service-category/luxury': <LuxuryServicePage />,
  '/service-category/cellular-das-and-public-safety': <CellularDASPublicSafetyServicePage />,
  // /groundswell (the partner sign-in) is a lazy chunk and keeps the shell.
  // /status keeps the shell too: its service table and uptime figures are
  // code constants with no data source (docs/geo/fact-sheet.md §10), so they
  // are not written into static HTML until the owner decides what the page is.
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
 * every component renders its code fallback.
 */
export function renderItBody(pagePath: string, content: Record<string, ContentMap> | null = null): string {
  const pattern = routePattern(pagePath);
  if (!pattern) throw new Error(`No New Wave IT body is rendered for ${pagePath}.`);
  const element = pattern === GUIDE_PATTERN ? <ServiceGuidePage /> : IT_ROUTE_ELEMENTS[pattern];
  seedContentCache(content);
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
  }
}
