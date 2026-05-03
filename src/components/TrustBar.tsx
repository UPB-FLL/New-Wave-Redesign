import { Shield, Award, Star, Users, TrendingUp } from 'lucide-react';

const trustItems = [
  { icon: Shield, label: 'SOC 2 Type II', sub: 'Audited & Certified' },
  { icon: Award, label: 'Microsoft Gold', sub: 'Cloud Solutions Partner' },
  { icon: Users, label: 'Cisco Premier', sub: 'Network Solutions' },
  { icon: Star, label: 'CompTIA', sub: 'Authorized Partner' },
  { icon: TrendingUp, label: 'HIPAA Compliant', sub: 'Healthcare Ready' },
];

export default function TrustBar() {
  return (
    <section
      className="py-10 relative"
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafb 100%)',
        borderTop: '1px solid rgba(21,34,50,0.06)',
        borderBottom: '1px solid rgba(21,34,50,0.06)',
        zIndex: 10,
      }}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'rgba(21,34,50,0.5)' }}>
            Trusted by 500+ businesses across South Florida
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {trustItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: 'white',
                border: '1px solid rgba(21,34,50,0.06)',
                boxShadow: '0 1px 4px rgba(21,34,50,0.03)',
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(57,204,204,0.1)' }}
              >
                <item.icon size={18} style={{ color: '#39CCCC' }} />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold truncate" style={{ color: '#152232' }}>
                  {item.label}
                </div>
                <div className="text-[10px] truncate" style={{ color: 'rgba(21,34,50,0.5)' }}>
                  {item.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
