import { BrowserRouter, Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}

// Routes that render as standalone, full-bleed experiences and should not show
// the global New Wave IT chrome (background art + floating quick-nav).
const BARE_ROUTES = ['/codenest'];

function SiteChrome() {
  const { pathname } = useLocation();
  // Division and Groundswell pages bring their own background and navigation.
  if (BARE_ROUTES.includes(pathname) || isDivisionPath(pathname) || isGroundswellPath(pathname)) return null;
  return (
    <>
      <WaveBackground />
      <FloatingNav />
    </>
  );
}
import { Analytics } from '@vercel/analytics/react';
import WaveBackground from './components/WaveBackground';
import PreviewBanner from './components/PreviewBanner';
import FloatingNav from './components/FloatingNav';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import Services from './components/Services';
import WhyUs from './components/WhyUs';
import Footer from './components/Footer';
import ContactPage from './pages/ContactPage';
import TermsAndConditionsPage from './pages/TermsAndConditionsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiePolicyPage from './pages/CookiePolicyPage';
import CybersecurityPage from './pages/CybersecurityPage';
import WhyUsPage from './pages/WhyUsPage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import PricingPage from './pages/PricingPage';
import SupportPage from './pages/SupportPage';
import StatusPage from './pages/StatusPage';
import ServiceDetailPage from './pages/ServiceDetailPage';
import ThreatDetailPage from './pages/ThreatDetailPage';
import CybersecurityServicePage from './pages/CybersecurityServicePage';
import LiveITSupportServicePage from './pages/LiveITSupportServicePage';
import ITRepairServicePage from './pages/ITRepairServicePage';
import ManagedITServicePage from './pages/ManagedITServicePage';
import CloudSolutionsServicePage from './pages/CloudSolutionsServicePage';
import NetworkInfrastructureServicePage from './pages/NetworkInfrastructureServicePage';
import FamilyOfficesServicePage from './pages/FamilyOfficesServicePage';
import HealthcareServicePage from './pages/HealthcareServicePage';
import LuxuryServicePage from './pages/LuxuryServicePage';
import ITSupportFortLauderdalePage from './pages/ITSupportFortLauderdalePage';
import ManagedITFortLauderdalePage from './pages/ManagedITFortLauderdalePage';
import CellularDASPublicSafetyServicePage from './pages/CellularDASPublicSafetyServicePage';
import ServiceGuidePage from './pages/ServiceGuidePage';
import CodeNestPage from './pages/CodeNestPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import NotFoundPage from './pages/NotFoundPage';
import GroundswellSignInPage from './pages/GroundswellSignInPage';
import { usePageMeta } from './lib/usePageMeta';
import { HOME_PAGE_META } from './lib/routeMeta';
import {
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_CONTACT_US_PATH,
  DIVISION_CUSTOMERS_PATH,
  DIVISION_CROISSANCE_PATH,
  DIVISION_PUBLISHED,
  DIVISION_SERVICE_SLUGS,
  divisionServicePath,
  isDivisionPath,
} from './divisions/socialEngineering/site';
import {
  SocialEngineeringContactRoute,
  SocialEngineeringContactUsRoute,
  SocialEngineeringCustomersRoute,
  SocialEngineeringHubRoute,
  SocialEngineeringCroissanceRoute,
  SocialEngineeringServiceRoute,
} from './divisions/socialEngineering/routes';
import {
  GROUNDSWELL_ADMIN_PATH,
  GROUNDSWELL_CUSTOMERS_PATH,
  GROUNDSWELL_SET_PASSWORD_PATH,
  isGroundswellPath,
  LEGACY_PARTNER_PATH,
} from './groundswell/site';
import {
  GroundswellAdminAudits,
  GroundswellAdminOverview,
  GroundswellAdminPartners,
  GroundswellAdminRoute,
  GroundswellCustomerRoute,
  GroundswellCustomersRoute,
  GroundswellSetPasswordRoute,
  LegacyAdminRedirect,
  LegacyPartnerRedirect,
} from './groundswell/routes';

// The admin dashboard loads on demand: public visitors (and crawlers measuring
// page speed) never download the editors.
const AdminGuard = lazy(() => import('./admin/AdminGuard'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminHome = lazy(() => import('./admin/AdminHome'));
const AdminBlogPage = lazy(() => import('./admin/blog/BlogPage'));
const AdminBlogSettings = lazy(() => import('./admin/blog/BlogSettings'));
const PricingUnitsEditor = lazy(() => import('./admin/editors/PricingUnitsEditor'));
// Every other CMS section is edited by SectionPage from its descriptor (src/admin/sections).
const SectionPage = lazy(() => import('./admin/SectionPage'));
const SeoPortal = lazy(() => import('./admin/seo/SeoPortal'));
const SeoPageEditor = lazy(() => import('./admin/seo/SeoPageEditor'));

function AdminFallback() {
  return <div className="min-h-screen" aria-busy="true" />;
}

// The WebSite, Organization, and LocalBusiness nodes live in index.html; this adds only the page node.
const HOME_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  '@id': 'https://www.newwaveitfl.com/#webpage',
  'url': 'https://www.newwaveitfl.com/',
  'name': HOME_PAGE_META.title,
  'isPartOf': { '@id': 'https://www.newwaveitfl.com/#website' },
  'about': { '@id': 'https://www.newwaveitfl.com/#business' },
  'description': HOME_PAGE_META.description,
};

function HomePage() {
  usePageMeta({ ...HOME_PAGE_META, jsonLd: HOME_JSON_LD });
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

export default function App() {
  return (
    <>
      <Analytics />
      <BrowserRouter>
        <ScrollToTop />
        <PreviewBanner />
        <SiteChrome />
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/codenest" element={<CodeNestPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/cookie-policy" element={<CookiePolicyPage />} />
        <Route path="/cybersecurity" element={<CybersecurityPage />} />
        <Route path="/why-us" element={<WhyUsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/service/:slug" element={<ServiceDetailPage />} />
        <Route path="/service-category/cybersecurity" element={<CybersecurityServicePage />} />
        <Route path="/service-category/live-it-support" element={<LiveITSupportServicePage />} />
        <Route path="/service-category/it-repair-upgrades" element={<ITRepairServicePage />} />
        <Route path="/service-category/managed-it-services" element={<ManagedITServicePage />} />
        <Route path="/service-category/cloud-solutions" element={<CloudSolutionsServicePage />} />
        <Route path="/service-category/network-infrastructure" element={<NetworkInfrastructureServicePage />} />
        <Route path="/service-category/family-offices" element={<FamilyOfficesServicePage />} />
        <Route path="/service-category/healthcare" element={<HealthcareServicePage />} />
        <Route path="/it-support-fort-lauderdale" element={<ITSupportFortLauderdalePage />} />
        <Route path="/managed-it-services-fort-lauderdale" element={<ManagedITFortLauderdalePage />} />
        <Route path="/service-category/luxury" element={<LuxuryServicePage />} />
        <Route path="/service-category/cellular-das-and-public-safety" element={<CellularDASPublicSafetyServicePage />} />
        <Route path="/threat/:slug" element={<ThreatDetailPage />} />
        <Route path="/l/:slug" element={<ServiceGuidePage />} />
        {/* New Wave: Social Engineering division (hidden while DIVISION_PUBLISHED is false) */}
        {DIVISION_PUBLISHED ? (
          <>
            <Route path={DIVISION_BASE_PATH} element={<SocialEngineeringHubRoute />} />
            {DIVISION_SERVICE_SLUGS.map((slug) => (
              <Route key={slug} path={divisionServicePath(slug)} element={<SocialEngineeringServiceRoute slug={slug} />} />
            ))}
            <Route path={DIVISION_CROISSANCE_PATH} element={<SocialEngineeringCroissanceRoute />} />
            <Route path={DIVISION_CUSTOMERS_PATH} element={<SocialEngineeringCustomersRoute />} />
            <Route path={DIVISION_CONTACT_US_PATH} element={<SocialEngineeringContactUsRoute />} />
            <Route path={DIVISION_CONTACT_PATH} element={<SocialEngineeringContactRoute />} />
          </>
        ) : null}
        {/* Groundswell: the sign-in is a prerendered static route; the rest is noindex and loads on demand. */}
        <Route path="/groundswell" element={<GroundswellSignInPage />} />
        <Route path={GROUNDSWELL_SET_PASSWORD_PATH} element={<GroundswellSetPasswordRoute />} />
        <Route path={GROUNDSWELL_CUSTOMERS_PATH} element={<GroundswellCustomersRoute />} />
        <Route path={`${GROUNDSWELL_CUSTOMERS_PATH}/:id`} element={<GroundswellCustomerRoute />} />
        <Route path={GROUNDSWELL_ADMIN_PATH} element={<GroundswellAdminRoute />}>
          <Route index element={<GroundswellAdminOverview />} />
          <Route path="audits" element={<GroundswellAdminAudits />} />
          <Route path="partners" element={<GroundswellAdminPartners />} />
        </Route>
        {/* The partner portal's old addresses under Croissance. */}
        <Route path={LEGACY_PARTNER_PATH} element={<LegacyPartnerRedirect to="sign-in" />} />
        <Route path={`${LEGACY_PARTNER_PATH}/dashboard`} element={<LegacyPartnerRedirect to="customers" />} />
        <Route path={`${LEGACY_PARTNER_PATH}/set-password`} element={<LegacyPartnerRedirect to="set-password" />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<AdminFallback />}>
              <AdminGuard>
                <AdminLayout />
              </AdminGuard>
            </Suspense>
          }
        >
          <Route index element={<AdminHome />} />
          {/* The two old dashboards; bookmarks still land somewhere useful. */}
          <Route path="unified" element={<Navigate to="/admin/blog" replace />} />
          <Route path="legacy" element={<Navigate to="/admin" replace />} />
          <Route path="blog" element={<AdminBlogPage />} />
          <Route path="blog/settings" element={<AdminBlogSettings />} />
          <Route path="hero" element={<SectionPage section="hero" />} />
          <Route path="trustbar" element={<SectionPage section="trustbar" />} />
          <Route path="services" element={<SectionPage section="services" />} />
          <Route path="whyus" element={<SectionPage section="whyus" />} />
          <Route path="about" element={<SectionPage section="about" />} />
          <Route path="contact" element={<SectionPage section="contact" />} />
          <Route path="footer" element={<SectionPage section="footer" />} />
          <Route path="pricing" element={<SectionPage section="pricing" />} />
          <Route path="pricing-units" element={<PricingUnitsEditor />} />
          <Route path="status" element={<SectionPage section="status" />} />
          <Route path="services-detail" element={<SectionPage section="services-detail" />} />
          <Route path="service-categories" element={<SectionPage section="services-categories" />} />
          <Route path="threats-detail" element={<SectionPage section="threats-detail" />} />
          <Route path="seo" element={<SeoPortal />} />
          <Route path="seo/:id" element={<SeoPageEditor />} />
          {/* Groundswell moved to its own section (/groundswell/admin); its old addresses redirect there. */}
          <Route path="groundswell" element={<LegacyAdminRedirect />} />
          <Route path="groundswell/*" element={<LegacyAdminRedirect />} />
          <Route path="audits" element={<Navigate to={`${GROUNDSWELL_ADMIN_PATH}/audits`} replace />} />
        </Route>
        {/* Anything unmatched, including unknown /social-engineering/* paths: a noindex page, not a blank one. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </BrowserRouter>
    </>
  );
}
