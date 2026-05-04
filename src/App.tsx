import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import BackgroundCircles from './components/BackgroundCircles';
import WaveBackground from './components/WaveBackground';
import FloatingNav from './components/FloatingNav';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustBar from './components/TrustBar';
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
import { usePageMeta } from './lib/usePageMeta';

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
      <Services />
      <WhyUs />
      <Testimonials />
      <About />
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
        <Route path="/l/:slug" element={<SeoLandingPage />} />
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
          <Route path="seo" element={<SeoPortal />} />
          <Route path="seo/:id" element={<SeoPageEditor />} />
        </Route>
      </Routes>
      </BrowserRouter>
    </>
  );
}
