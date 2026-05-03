import { ArrowRight, Shield, ShieldCheck, Activity, Lock, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

type ActivityEvent = { id: number; type: string; secondsAgo: number; color: string };

const EVENT_POOL: { type: string; color: string }[] = [
  { type: 'Phishing attempt blocked', color: '#5EBC67' },
  { type: 'Suspicious login flagged', color: '#ffd93d' },
  { type: 'Malware quarantined', color: '#5EBC67' },
  { type: 'Brute force attempt blocked', color: '#5EBC67' },
  { type: 'Ransomware signature detected', color: '#ff6b6b' },
  { type: 'Firewall rule auto-updated', color: '#39CCCC' },
  { type: 'DNS exfiltration prevented', color: '#5EBC67' },
  { type: 'Endpoint scan completed', color: '#39CCCC' },
  { type: 'Zero-day exploit patched', color: '#ffd93d' },
  { type: 'Outbound C2 traffic blocked', color: '#5EBC67' },
  { type: 'MFA challenge enforced', color: '#39CCCC' },
  { type: 'Credential leak alert resolved', color: '#5EBC67' },
];

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
};

export default function CybersecurityHero() {
  const [threatCount, setThreatCount] = useState(2847291);
  const [events, setEvents] = useState<ActivityEvent[]>([
    { id: 1, type: 'Phishing attempt blocked', secondsAgo: 2, color: '#5EBC67' },
    { id: 2, type: 'Suspicious login flagged', secondsAgo: 14, color: '#ffd93d' },
    { id: 3, type: 'Malware quarantined', secondsAgo: 47, color: '#5EBC67' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setThreatCount((prev) => prev + Math.floor(Math.random() * 8) + 2);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Tick the "seconds ago" counter every second
  useEffect(() => {
    const tick = setInterval(() => {
      setEvents((prev) => prev.map((e) => ({ ...e, secondsAgo: e.secondsAgo + 1 })));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  // Periodically push a new event to the top, dropping the oldest
  useEffect(() => {
    let nextId = 100;
    const rotate = setInterval(() => {
      setEvents((prev) => {
        const pool = EVENT_POOL.filter((p) => !prev.slice(0, 2).some((e) => e.type === p.type));
        const pick = pool[Math.floor(Math.random() * pool.length)];
        const next: ActivityEvent = { id: nextId++, type: pick.type, secondsAgo: 1, color: pick.color };
        return [next, prev[0], prev[1]];
      });
    }, 4500);
    return () => clearInterval(rotate);
  }, []);

  const handleScroll = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      className="relative flex items-center overflow-hidden bg-white pt-24 pb-12 sm:pt-28 sm:pb-16"
      style={{ zIndex: 10 }}
    >
      {/* Decorative gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-40 -right-40 w-[700px] h-[700px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(57,204,204,0.15) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="absolute bottom-0 -left-40 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(94,188,103,0.12) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(21,34,50,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(21,34,50,0.04) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Left: Content */}
          <div className="lg:col-span-7">
            {/* Live status badge */}
            <div className="inline-flex items-center gap-2 mb-5">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{
                  background: 'rgba(94,188,103,0.1)',
                  border: '1px solid rgba(94,188,103,0.3)',
                  color: '#5EBC67',
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: '#5EBC67' }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: '#5EBC67' }}
                  />
                </span>
                SOC OPERATIONAL — 24/7 MONITORING ACTIVE
              </div>
            </div>

            <h1
              className="text-3xl sm:text-4xl lg:text-6xl leading-[0.95] tracking-tight mb-4"
              style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
            >
              Enterprise security{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #39CCCC 0%, #5EBC67 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                without the enterprise headache.
              </span>
            </h1>

            <p
              className="text-sm sm:text-base lg:text-lg leading-relaxed mb-5 sm:mb-7 max-w-2xl"
              style={{ color: 'rgba(21,34,50,0.65)' }}
            >
              Stop threats before they reach your business. Our 24/7 security operations
              center, AI-powered threat detection, and certified analysts deliver
              Fortune 500-grade protection at SMB-friendly pricing.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-7">
              <button
                onClick={() => handleScroll('#cta')}
                className="group flex items-center justify-center gap-2.5 font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 text-white"
                style={{
                  background: 'linear-gradient(135deg, #39CCCC 0%, #2db8b8 100%)',
                  boxShadow: '0 8px 32px rgba(57,204,204,0.35)',
                }}
              >
                Get Free Security Assessment
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => handleScroll('#services')}
                className="font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                style={{
                  border: '1.5px solid rgba(21,34,50,0.15)',
                  color: '#152232',
                  background: 'rgba(255,255,255,0.6)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Explore Solutions
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-4 lg:gap-6 pt-5" style={{ borderTop: '1px solid rgba(21,34,50,0.08)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: '#5EBC67' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(21,34,50,0.7)' }}>
                  SOC 2 Type II
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: '#5EBC67' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(21,34,50,0.7)' }}>
                  ISO 27001
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: '#5EBC67' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(21,34,50,0.7)' }}>
                  HIPAA Compliant
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} style={{ color: '#5EBC67' }} />
                <span className="text-sm font-medium" style={{ color: 'rgba(21,34,50,0.7)' }}>
                  PCI-DSS Certified
                </span>
              </div>
            </div>
          </div>

          {/* Right: Live Threat Dashboard */}
          <div className="lg:col-span-5">
            <div
              className="rounded-3xl p-1"
              style={{
                background: 'linear-gradient(135deg, rgba(57,204,204,0.4), rgba(94,188,103,0.4))',
                boxShadow: '0 24px 64px rgba(21,34,50,0.12)',
              }}
            >
              <div className="rounded-3xl p-5 lg:p-6" style={{ background: 'white' }}>
                {/* Dashboard header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Activity size={18} style={{ color: '#39CCCC' }} />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#152232' }}>
                      Live Threat Intelligence
                    </span>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff6b6b' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#ffd93d' }} />
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#5EBC67' }} />
                  </div>
                </div>

                {/* Big metric */}
                <div
                  className="rounded-2xl p-5 mb-3"
                  style={{
                    background: 'linear-gradient(135deg, rgba(57,204,204,0.08) 0%, rgba(94,188,103,0.08) 100%)',
                    border: '1px solid rgba(57,204,204,0.15)',
                  }}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'rgba(21,34,50,0.6)' }}>
                    Threats Blocked This Year
                  </div>
                  <div
                    className="text-3xl lg:text-4xl font-bold tabular-nums"
                    style={{ fontFamily: 'Staatliches, sans-serif', color: '#152232' }}
                  >
                    {threatCount.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-xs font-medium" style={{ color: '#5EBC67' }}>
                    <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#5EBC67' }} />
                    Updating in real-time
                  </div>
                </div>

                {/* Threat indicators */}
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(94,188,103,0.06)', border: '1px solid rgba(94,188,103,0.15)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Shield size={12} style={{ color: '#5EBC67' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(21,34,50,0.65)' }}>
                        System Status
                      </span>
                    </div>
                    <div className="text-sm font-bold" style={{ color: '#5EBC67' }}>
                      All Secure
                    </div>
                  </div>
                  <div
                    className="rounded-xl p-3"
                    style={{ background: 'rgba(57,204,204,0.06)', border: '1px solid rgba(57,204,204,0.15)' }}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Lock size={12} style={{ color: '#39CCCC' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'rgba(21,34,50,0.65)' }}>
                        Encryption
                      </span>
                    </div>
                    <div className="text-sm font-bold" style={{ color: '#39CCCC' }}>
                      AES-256
                    </div>
                  </div>
                </div>

                {/* Recent threat log */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'rgba(21,34,50,0.5)' }}>
                    Recent Activity
                  </div>
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg transition-all duration-500"
                      style={{ background: 'rgba(21,34,50,0.02)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <AlertTriangle size={12} style={{ color: event.color }} className="flex-shrink-0" />
                        <span className="text-xs truncate" style={{ color: 'rgba(21,34,50,0.75)' }}>
                          {event.type}
                        </span>
                      </div>
                      <span className="text-xs tabular-nums flex-shrink-0 ml-2" style={{ color: 'rgba(21,34,50,0.4)' }}>
                        {formatTime(event.secondsAgo)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
