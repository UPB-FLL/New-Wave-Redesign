import Navbar from '../components/Navbar';
import About from '../components/About';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import { usePageMeta } from '../lib/usePageMeta';

export default function AboutPage() {
  usePageMeta({
    title: 'About New Wave IT — Fort Lauderdale Managed IT Services',
    description:
      'Meet New Wave IT: certified engineers, project managers, and technology advisors serving Fort Lauderdale and South Florida businesses since 2009.',
  });
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="pt-20">
        <About />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
