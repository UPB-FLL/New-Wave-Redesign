import Navbar from '../components/Navbar';
import CybersecurityHero from '../components/cybersecurity/CybersecurityHero';
import SecurityStats from '../components/cybersecurity/SecurityStats';
import CybersecurityServices from '../components/cybersecurity/CybersecurityServices';
import ThreatProtection from '../components/cybersecurity/ThreatProtection';
import SecurityProcess from '../components/cybersecurity/SecurityProcess';
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
    <div className="min-h-screen" style={{ background: 'white' }}>
      <Navbar />
      <CybersecurityHero />
      <SecurityStats />
      <CybersecurityServices />
      <ThreatProtection />
      <SecurityProcess />
      <ComplianceFrameworks />
      <CyberSecurityCTA />
      <Footer />
    </div>
  );
}
