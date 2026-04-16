import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Services from './components/Services';
import WhyUs from './components/WhyUs';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AdminGuard from './admin/AdminGuard';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import HeroEditor from './admin/editors/HeroEditor';
import ServicesEditor from './admin/editors/ServicesEditor';
import WhyUsEditor from './admin/editors/WhyUsEditor';
import AboutEditor from './admin/editors/AboutEditor';
import ContactEditor from './admin/editors/ContactEditor';
import FooterEditor from './admin/editors/FooterEditor';
import CybersecurityPage from './pages/CybersecurityPage';
import WhyUsPage from './pages/WhyUsPage';
import AboutPage from './pages/AboutPage';
import ServicesPage from './pages/ServicesPage';
import PricingPage from './pages/PricingPage';
import PricingEditor from './admin/editors/PricingEditor';

function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <Hero />
      <Services />
      <WhyUs />
      <About />
      <Contact />
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cybersecurity" element={<CybersecurityPage />} />
        <Route path="/why-us" element={<WhyUsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/services" element={<ServicesPage />} />
        <Route path="/pricing" element={<PricingPage />} />
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
          <Route path="services" element={<ServicesEditor />} />
          <Route path="whyus" element={<WhyUsEditor />} />
          <Route path="about" element={<AboutEditor />} />
          <Route path="contact" element={<ContactEditor />} />
          <Route path="footer" element={<FooterEditor />} />
          <Route path="pricing" element={<PricingEditor />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
