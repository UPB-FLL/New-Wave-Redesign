import Navbar from '../components/Navbar';
import WhyUs from '../components/WhyUs';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

export default function WhyUsPage() {
  usePageMeta({
    title: 'Why Choose New Wave IT — Trusted MSP in Fort Lauderdale',
    description:
      'Flat-rate pricing, no long-term contracts, 24/7 monitoring, sub-1-hour average response. See why South Florida businesses choose New Wave IT.',
    keywords: 'best MSP Fort Lauderdale, why choose New Wave IT, IT provider comparison South Florida, flat-rate IT services',
    canonical: 'https://www.newwaveitfl.com/why-us',
  });
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="pt-20">
        <WhyUs headlineAs="h1" />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
