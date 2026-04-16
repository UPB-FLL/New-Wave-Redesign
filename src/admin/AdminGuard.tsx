import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import AdminLogin from './AdminLogin';

export default function AdminGuard({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(!!data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(!!session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1923' }}>
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#39CCCC', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!session) return <AdminLogin />;

  return <>{children}</>;
}
