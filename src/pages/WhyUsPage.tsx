import Navbar from '../components/Navbar';
import WhyUs from '../components/WhyUs';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

export default function WhyUsPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <Navbar />
      <div className="pt-20">
        <WhyUs />
      </div>
      <Contact />
      <Footer />
    </div>
  );
}
