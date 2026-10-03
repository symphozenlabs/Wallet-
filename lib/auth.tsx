import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';

const Context = createContext<{ session: Session | null; loading: boolean; error: string | null }>({ session: null, loading: true, error: null });
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.hash.slice(1)).get('error_description');
  });
  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      if (active) { setSession(next); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data, error }) => {
      if (active) { setSession(data.session); if (error) setError(error.message); setLoading(false); }
    }).catch(() => { if (active) { setError('Could not connect. Please refresh and try again.'); setLoading(false); } });
    const listener = AppState.addEventListener('change', state => {
      if (Platform.OS !== 'web') state === 'active' ? supabase.auth.startAutoRefresh() : supabase.auth.stopAutoRefresh();
    });
    return () => { active = false; subscription.unsubscribe(); listener.remove(); };
  }, []);
  return <Context.Provider value={{ session, loading, error }}>{children}</Context.Provider>;
}
export const useAuth = () => useContext(Context);
