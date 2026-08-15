import { useState } from 'react';
import { LogIn, Mail, MessageCircle, Phone } from 'lucide-react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import CustomerPortalCard from '../components/support/CustomerPortalCard';
import SupportChatCard from '../components/support/SupportChatCard';
import SupportEmailCard from '../components/support/SupportEmailCard';
import { FadeIn } from '../components/ui/fade-in';
import { useContent } from '../lib/useContent';
import { usePageMeta } from '../lib/usePageMeta';

type Channel = 'email' | 'portal' | 'chat';

const channels: Array<{
  id: Channel;
  label: string;
  blurb: string;
  icon: typeof Mail;
  accent: string;
}> = [
  {
    id: 'email',
    label: 'Email support',
    blurb: 'Send a message straight to support@newwaveitfl.com.',
    icon: Mail,
    accent: 'var(--nw-signal-cyan)',
  },
  {
    id: 'portal',
    label: 'Customer login',
    blurb: 'Sign in to see your live SuperOps tickets and their status.',
    icon: LogIn,
    accent: 'var(--nw-tide-blue)',
  },
  {
    id: 'chat',
    label: 'Live chat',
    blurb: 'Message a technician. It texts their cell, they answer here.',
    icon: MessageCircle,
    accent: 'var(--nw-tide-blue)',
  },
];

export default function SupportPage() {
  usePageMeta({
    title: 'IT Support - Email, Customer Login & Live Chat',
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
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <main className="flex-1 pt-20">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <FadeIn>
            <div className="mb-8 sm:mb-10">
              <p className="nw-kicker">We are on it</p>
              <h1 className="nw-display mb-4 mt-2 text-4xl leading-[1.05] text-brand-navy sm:text-5xl lg:text-6xl">
                Get support <span className="text-brand-tide-blue">your way.</span>
              </h1>
              <p className="max-w-2xl text-sm text-[var(--nw-slate)] sm:text-base">
                Email us, sign in to check your tickets, or chat with a technician in real time. Whatever is fastest for you, we answer on all three.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={0.05}>
            <a
              href={`tel:${phone.replace(/\D/g, '')}`}
              className="mb-8 flex items-center gap-4 rounded-lg p-4 sm:mb-10 sm:p-5 nw-surface-dark"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md" style={{ background: 'var(--nw-deep-current)', color: 'var(--nw-signal-cyan)' }}>
                <Phone size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-[var(--nw-cloud-white)]">Business down? Call us 24/7.</span>
                <span className="mt-1 block text-sm text-[var(--nw-mist-gray)]">A real technician picks up, day or night.</span>
              </span>
              <span className="hidden shrink-0 font-semibold text-[var(--nw-signal-cyan)] sm:block">{phone}</span>
            </a>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="mb-8 grid gap-3 sm:grid-cols-3 sm:gap-4" role="tablist" aria-label="Support channels">
              {channels.map((option) => {
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
                    className="rounded-lg p-4 text-left transition-colors sm:p-5"
                    style={{
                      background: active ? 'var(--nw-pure-white)' : 'var(--nw-cloud-white)',
                      border: `1px solid ${active ? option.accent : 'var(--nw-mist-gray)'}`,
                      boxShadow: active ? '0 4px 16px rgba(9, 19, 29, 0.08)' : 'none',
                    }}
                  >
                    <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-md" style={{ background: 'var(--nw-pure-white)', color: active ? option.accent : 'var(--nw-slate)' }}>
                      <Icon size={18} />
                    </span>
                    <span className="mb-1 block font-semibold text-brand-navy">{option.label}</span>
                    <span className="block text-xs leading-relaxed text-[var(--nw-slate)]">{option.blurb}</span>
                  </button>
                );
              })}
            </div>
          </FadeIn>

          <div role="tabpanel" id={`support-panel-${channel}`} aria-labelledby={`support-tab-${channel}`}>
            {channel === 'email' ? <SupportEmailCard /> : null}
            {channel === 'portal' ? <CustomerPortalCard /> : null}
            {channel === 'chat' ? <SupportChatCard /> : null}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
