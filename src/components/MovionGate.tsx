import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import MovionComingSoon from '@/pages/MovionComingSoon';

/**
 * MOVION access gate.
 * Movion is LIVE only for admin users; everyone else keeps seeing
 * the "Coming Soon" page. Purely a routing gate — no Movion logic here.
 */
export const MovionGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) {
        setIsAdmin(false);
        setChecking(false);
        return;
      }
      const { data, error } = await supabase
        .from('user_roles' as any)
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (cancelled) return;
      setIsAdmin(!error && !!data);
      setChecking(false);
    }
    check();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <MovionComingSoon />;

  return <>{children}</>;
};

export default MovionGate;
