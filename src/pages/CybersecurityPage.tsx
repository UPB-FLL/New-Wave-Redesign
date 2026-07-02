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
    title: 'Cybersecurity Threat Center — Attack Types, Defenses & Compliance',
    description:
      'Explore the cyber threats targeting South Florida businesses — ransomware, phishing, insider risk — and how New Wave IT detects, defends, and keeps you compliant.',
    keywords: 'cyber threats South Florida, ransomware protection, phishing defense, threat intelligence, security compliance, cybersecurity threat center',
    canonical: 'https://www.newwaveitfl.com/cybersecurity',
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
