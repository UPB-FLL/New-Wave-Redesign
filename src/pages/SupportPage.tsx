import { useState } from 'react';
import { LogIn, Mail, MessageCircle, Phone } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SupportEmailCard from '../components/support/SupportEmailCard';
import CustomerPortalCard from '../components/support/CustomerPortalCard';
import SupportChatCard from '../components/support/SupportChatCard';
import { FadeIn } from '../components/ui/fade-in';
import { useContent } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';

type Channel = 'email' | 'portal' | 'chat';

const CHANNELS: Array<{
  id: Channel;
  label: string;
  blurb: string;
  icon: typeof Mail;
  accent: string;
}> = [
  {
    id: 'email',
    label: 'Email support',
    blurb: 'Write to support@newwaveitfl.com and get a copy for your records.',
    icon: Mail,
    accent: '#39CCCC',
  },
  {
    id: 'portal',
    label: 'Customer login',
    blurb: 'Sign in to see your live SuperOps tickets and their status.',
    icon: LogIn,
    accent: '#152232',
  },
  {
    id: 'chat',
    label: 'Live chat',
    blurb: 'Message a technician. It texts their cell, they answer here.',
    icon: MessageCircle,
    accent: '#5EBC67',
  },
];

export default function SupportPage() {
  usePageMeta({
    title: 'IT Support — Email, Customer Login & Live Chat',
    description:
      'Reach New Wave IT support three ways: email support@newwaveitfl.com, sign in to view your SuperOps tickets, or start a live chat that texts an on-call technician.',
    keywords:
      'IT support Fort Lauderdale, support ticket portal, SuperOps customer login, live IT chat, New Wave IT support',
    canonical: 'https://www.newwaveitfl.com/support',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'New Wave IT Support',
      url: 'https://www.newwaveitfl.com/support',
      description:
        'Support channels for New Wave IT customers: email, customer ticket portal, and live chat.',
      mainEntity: { '@id': 'https://www.newwaveitfl.com/#business' },
    },
  });

  const contact = useContent('contact');
  const phone = contact.phone || '(954) 372-5100';
  const [channel, setChannel] = useState<Channel>('email');

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <Navbar />

      <main className="pt-20 flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <FadeIn>
            <div className="mb-8 sm:mb-10">
              <span
                className="text-xs sm:text-sm font-semibold uppercase tracking-widest"
                style={{ color: '#39CCCC' }}
              >
                We are on it
              </span>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl mt-2 mb-4 leading-[0.95] tracking-tight"
                style={{ fontFamily: "'Staatliches', 'Impact', 'Arial Narrow', sans-serif", color: '#152232' }}
              >
                Get support{' '}
                <span
                  style={{
                    display: 'inline-block',
                    background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  your way.
                </span>
              </h1>
              <p className="text-sm sm:text-base max-w-2xl" style={{ color: 'rgba(21,34,50,0.6)' }}>
                Email us, sign in to check your tickets, or chat with a technician in real time.
                Whatever is fastest for you — we answer on all three.
              </p>
            </div>
          </FadeIn>

          {/* Emergency line — always one tap away, whichever channel is open. */}
          <FadeIn delay={0.05}>
            <a
              href={`tel:${phone.replace(/\D/g, '')}`}
              className="flex items-center gap-4 rounded-2xl p-4 sm:p-5 mb-8 sm:mb-10 transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'linear-gradient(135deg, #152232 0%, #1d3047 100%)',
                boxShadow: '0 6px 20px rgba(21,34,50,0.18)',
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(57,204,204,0.18)' }}
              >
                <Phone size={20} style={{ color: '#39CCCC' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">Business down? Call us — 24/7.</p>
                <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  A real technician picks up, day or night.
                </p>
              </div>
              <span
                className="hidden sm:block font-semibold text-lg shrink-0"
                style={{ color: '#39CCCC' }}
              >
                {phone}
              </span>
            </a>
          </FadeIn>

          {/* Channel picker */}
          <FadeIn delay={0.1}>
            <div className="grid sm:grid-cols-3 gap-3 sm:gap-4 mb-8" role="tablist" aria-label="Support channels">
              {CHANNELS.map((option) => {
                const active = channel === option.id;
                const Icon = option.icon;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    id={`support-tab-${option.id}`}
                    aria-selected={active}
                    aria-controls={`support-panel-${option.id}`}
                    onClick={() => setChannel(option.id)}
                    className="text-left rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: active ? 'white' : '#f8fafb',
                      border: `1.5px solid ${active ? option.accent : 'rgba(21,34,50,0.08)'}`,
                      boxShadow: active ? `0 8px 24px ${option.accent}22` : 'none',
                    }}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: active ? `${option.accent}1f` : 'rgba(21,34,50,0.05)' }}
                    >
                      <Icon size={18} style={{ color: active ? option.accent : 'rgba(21,34,50,0.45)' }} />
                    </div>
                    <p
                      className="font-semibold mb-1"
                      style={{ color: active ? '#152232' : 'rgba(21,34,50,0.75)' }}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: 'rgba(21,34,50,0.55)' }}>
                      {option.blurb}
                    </p>
                  </button>
                );
              })}
            </div>
          </FadeIn>

          <div
            role="tabpanel"
            id={`support-panel-${channel}`}
            aria-labelledby={`support-tab-${channel}`}
          >
            {channel === 'email' && <SupportEmailCard />}
            {channel === 'portal' && <CustomerPortalCard />}
            {channel === 'chat' && <SupportChatCard />}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
