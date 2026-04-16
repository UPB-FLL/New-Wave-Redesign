import Navbar from '../components/Navbar';
import CybersecurityHero from '../components/cybersecurity/CybersecurityHero';
import CybersecurityServices from '../components/cybersecurity/CybersecurityServices';
import SecurityStats from '../components/cybersecurity/SecurityStats';
import ThreatProtection from '../components/cybersecurity/ThreatProtection';
import ComplianceFrameworks from '../components/cybersecurity/ComplianceFrameworks';
import CyberSecurityCTA from '../components/cybersecurity/CyberSecurityCTA';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

export default function CybersecurityPage() {
  usePageMeta({
    title: 'Cybersecurity Services in Fort Lauderdale — Threat Protection & Compliance',
    description:
      'Enterprise-grade cybersecurity for South Florida businesses: threat detection, endpoint protection, compliance audits, and 24/7 monitoring.',
  });
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <CybersecurityHero />
      <CybersecurityServices />
      <SecurityStats />
      <ThreatProtection />
      <ComplianceFrameworks />
      <CyberSecurityCTA />
      <Footer />
    </div>
  );
}
