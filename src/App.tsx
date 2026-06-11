import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname]);
  return null;
}
import { Analytics } from '@vercel/analytics/react';
import BackgroundCircles from './components/BackgroundCircles';
import WaveBackground from './components/WaveBackground';
import FloatingNav from './components/FloatingNav';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
import Stats from './components/Stats';
import Services from './components/Services';
import WhyUs from './components/WhyUs';
import Testimonials from './components/Testimonials';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminGuard from './admin/AdminGuard';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import HeroEditor from './admin/editors/HeroEditor';
import TrustBarEditor from './admin/editors/TrustBarEditor';
import ServicesEditor from './admin/editors/ServicesEditor';
import WhyUsEditor from './admin/editors/WhyUsEditor';
import AboutEditor from './admin/editors/AboutEditor';
import ContactEditor from './admin/editors/ContactEditor';
import FooterEditor from './admin/editors/FooterEditor';
import PricingUnitsEditor from './admin/editors/PricingUnitsEditor';
import CybersecurityPage from './pages/CybersecurityPage';
import WhyUsPage from './pages/WhyUsPage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import PricingPage from './pages/PricingPage';
import PricingEditor from './admin/editors/PricingEditor';
import SupportPage from './pages/SupportPage';
import StatusPage from './pages/StatusPage';
import StatusEditor from './admin/editors/StatusEditor';
import SeoPortal from './admin/seo/SeoPortal';
import SeoPageEditor from './admin/seo/SeoPageEditor';
import SeoLandingPage from './pages/SeoLandingPage';
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
import ServicesDetailEditor from './admin/editors/ServicesDetailEditor';
import ThreatsDetailEditor from './admin/editors/ThreatsDetailEditor';
import ServicesCategoryEditor from './admin/editors/ServicesCategoryEditor';
import { usePageMeta } from './lib/usePageMeta';
import ElfsightChatbot from './components/ElfsightChatbot';

function HomePage() {
  usePageMeta({
    title: 'New Wave IT — 24/7 Managed IT, Cybersecurity & Cloud in Fort Lauderdale',
    description:
      "Fort Lauderdale's trusted managed IT services partner. 24/7 support, cybersecurity, cloud migration, and network infrastructure for South Florida businesses.",
    includeSiteName: false,
  });
  return (
    <div className="min-h-screen relative" style={{ background: 'white' }}>
      <Navbar />
      <Hero />
      <TrustBar />
      <Stats />
      <Services />
      <WhyUs />
      <Testimonials />
      <Contact />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <>
      <Analytics />
      <BackgroundCircles />
      <WaveBackground />
      <BrowserRouter>
        <ScrollToTop />
        <FloatingNav />
        <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cybersecurity" element={<CybersecurityPage />} />
        <Route path="/why-us" element={<WhyUsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
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
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminLayout />
            </AdminGuard>
          }
        >
          <Route index element={<AdminDashboard />} />
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
      </Routes>
      </BrowserRouter>
      <ElfsightChatbot />
    </>
  );
}
