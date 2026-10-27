import { useState } from 'react';
import { LogIn, Mail, MessageCircle, Phone } from 'lucide-react';
import Footer from '../components/Footer';
import Navbar from '../components/Navbar';
import CustomerPortalCard from '../components/support/CustomerPortalCard';
import SupportChatCard from '../components/support/SupportChatCard';
import SupportEmailCard from '../components/support/SupportEmailCard';
import { PageHeader } from '../components/brand/PageHeader';
import { SectionHeading } from '../components/brand/SectionHeading';
import { FadeIn } from '../components/ui/fade-in';
import { useContent } from '../lib/useContent';
import { IT_PAGE_META } from '../lib/routeMeta';
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
    ...IT_PAGE_META['/support'],
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
  const phone = contact.phone || '(561) 564-1846';
  const [channel, setChannel] = useState<Channel>('email');

  return (
    <div className="flex min-h-screen flex-col" style={{ background: 'var(--nw-cloud-white)' }}>
      <Navbar />
      <PageHeader
        breadcrumbs={IT_PAGE_META['/support'].breadcrumbs}
        title="Get support your way"
        description="Email us, sign in to check your tickets, or chat with a technician in real time. Whatever is fastest for you, we answer on all three."
        actions={
          <a href={`tel:${phone.replace(/\D/g, '')}`} className="btn-primary">
            <Phone size={17} aria-hidden="true" />
            Call 24/7: {phone}
          </a>
        }
      >
        <p className="mt-4 text-sm text-[var(--nw-mist-gray)]">Business down? A real technician picks up, day or night.</p>
      </PageHeader>
      <main className="flex-1">
        <section className="relative z-10 py-12 sm:py-16">
          {/* Left edge shared with the page header; the channels keep a readable width. */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl">
              <SectionHeading title="Choose how to reach us" className="mb-6" />
              <FadeIn>
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
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
