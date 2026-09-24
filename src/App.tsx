import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
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
  // Division pages bring their own background and navigation.
  if (BARE_ROUTES.includes(pathname) || isDivisionPath(pathname)) return null;
  return (
    <>
      <WaveBackground />
      <FloatingNav />
    </>
  );
}
import { Analytics } from '@vercel/analytics/react';
import WaveBackground from './components/WaveBackground';
import FloatingNav from './components/FloatingNav';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import Stats from './components/Stats';
import Services from './components/Services';
import WhyUs from './components/WhyUs';
import Testimonials from './components/Testimonials';
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
import CellularDASPublicSafetyServicePage from './pages/CellularDASPublicSafetyServicePage';
import ServiceGuidePage from './pages/ServiceGuidePage';
import CodeNestPage from './pages/CodeNestPage';
import BlogPage from './pages/BlogPage';
import BlogPostPage from './pages/BlogPostPage';
import NotFoundPage from './pages/NotFoundPage';
import { usePageMeta } from './lib/usePageMeta';
import { HOME_PAGE_META } from './lib/routeMeta';
import ElfsightChatbot from './components/ElfsightChatbot';
import {
  DIVISION_BASE_PATH,
  DIVISION_CONTACT_PATH,
  DIVISION_CONTACT_US_PATH,
  DIVISION_CUSTOMERS_PATH,
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
  SocialEngineeringServiceRoute,
} from './divisions/socialEngineering/routes';

// The admin dashboard loads on demand: public visitors (and crawlers measuring
// page speed) never download the editors.
const AdminGuard = lazy(() => import('./admin/AdminGuard'));
const AdminLayout = lazy(() => import('./admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const UnifiedAdminDashboard = lazy(() => import('./admin/UnifiedAdminDashboard'));
const HeroEditor = lazy(() => import('./admin/editors/HeroEditor'));
const TrustBarEditor = lazy(() => import('./admin/editors/TrustBarEditor'));
const ServicesEditor = lazy(() => import('./admin/editors/ServicesEditor'));
const WhyUsEditor = lazy(() => import('./admin/editors/WhyUsEditor'));
const AboutEditor = lazy(() => import('./admin/editors/AboutEditor'));
const ContactEditor = lazy(() => import('./admin/editors/ContactEditor'));
const FooterEditor = lazy(() => import('./admin/editors/FooterEditor'));
const PricingUnitsEditor = lazy(() => import('./admin/editors/PricingUnitsEditor'));
const PricingEditor = lazy(() => import('./admin/editors/PricingEditor'));
const StatusEditor = lazy(() => import('./admin/editors/StatusEditor'));
const SeoPortal = lazy(() => import('./admin/seo/SeoPortal'));
const SeoPageEditor = lazy(() => import('./admin/seo/SeoPageEditor'));
const ServicesDetailEditor = lazy(() => import('./admin/editors/ServicesDetailEditor'));
const ThreatsDetailEditor = lazy(() => import('./admin/editors/ThreatsDetailEditor'));
const ServicesCategoryEditor = lazy(() => import('./admin/editors/ServicesCategoryEditor'));

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
      <Stats />
      <Services />
      <WhyUs />
      <Testimonials />
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
            <Route path={DIVISION_CUSTOMERS_PATH} element={<SocialEngineeringCustomersRoute />} />
            <Route path={DIVISION_CONTACT_US_PATH} element={<SocialEngineeringContactUsRoute />} />
            <Route path={DIVISION_CONTACT_PATH} element={<SocialEngineeringContactRoute />} />
          </>
        ) : null}
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
          <Route index element={<AdminDashboard />} />
          <Route path="unified" element={<UnifiedAdminDashboard />} />
          <Route path="legacy" element={<AdminDashboard />} />
          <Route path="hero" element={<HeroEditor />} />
          <Route path="trustbar" element={<TrustBarEditor />} />
          <Route path="services" element={<ServicesEditor />} />
          <Route path="whyus" element={<WhyUsEditor />} />
          <Route path="about" element={<AboutEditor />} />
          <Route path="contact" element={<ContactEditor />} />
          <Route path="footer" element={<FooterEditor />} />
          <Route path="pricing" element={<PricingEditor />} />
          <Route path="pricing-units" element={<PricingUnitsEditor />} />
          <Route path="status" element={<StatusEditor />} />
          <Route path="services-detail" element={<ServicesDetailEditor />} />
          <Route path="service-categories" element={<ServicesCategoryEditor />} />
          <Route path="threats-detail" element={<ThreatsDetailEditor />} />
          <Route path="seo" element={<SeoPortal />} />
          <Route path="seo/:id" element={<SeoPageEditor />} />
        </Route>
        {/* Anything unmatched, including unknown /social-engineering/* paths: a noindex page, not a blank one. */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </BrowserRouter>
      <ElfsightChatbot />
    </>
  );
}
