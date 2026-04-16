import Navbar from '../components/Navbar';
import CybersecurityHero from '../components/cybersecurity/CybersecurityHero';
import CybersecurityServices from '../components/cybersecurity/CybersecurityServices';
import SecurityStats from '../components/cybersecurity/SecurityStats';
import ThreatProtection from '../components/cybersecurity/ThreatProtection';
import ComplianceFrameworks from '../components/cybersecurity/ComplianceFrameworks';
import CyberSecurityCTA from '../components/cybersecurity/CyberSecurityCTA';
import Footer from '../components/Footer';

export default function CybersecurityPage() {
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
