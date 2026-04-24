/**
 * GlobalCallHost — lazily mounted CallProvider that only activates for
 * authenticated users. Lives at the chats module boundary so it can be
 * imported from App.tsx with a single line and zero side-effects on routes
 * the user has not visited (it only opens dialogs when calls happen).
 */
import { useAuth } from '@/contexts/AuthContext';
import { CallProvider } from './CallProvider';
import type { ReactNode } from 'react';

export const GlobalCallHost = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading || !user) return <>{children}</>;
  return <CallProvider>{children}</CallProvider>;
};
