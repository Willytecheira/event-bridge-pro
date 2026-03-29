import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  email: string | null;
  role: 'admin' | 'viewer' | null;
}

// Shared state across all hook instances
let globalState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  email: null,
  role: null,
};
let listeners: Set<(s: AuthState) => void> = new Set();
let initialized = false;

function setGlobalState(s: AuthState) {
  globalState = s;
  listeners.forEach((fn) => fn(s));
}

async function fetchRole(userId: string): Promise<'admin' | 'viewer'> {
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    return (data?.role as 'admin' | 'viewer') ?? 'viewer';
  } catch {
    return 'viewer';
  }
}

function initAuth() {
  if (initialized) return;
  initialized = true;

  // Set up listener first
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (session?.user) {
        // Set authenticated immediately, fetch role in background
        setGlobalState({
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
          email: session.user.email ?? null,
          role: globalState.role, // keep previous role until fetched
        });
        const role = await fetchRole(session.user.id);
        setGlobalState({
          ...globalState,
          user: session.user,
          session,
          isAuthenticated: true,
          isLoading: false,
          email: session.user.email ?? null,
          role,
        });
      } else {
        setGlobalState({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
          email: null,
          role: null,
        });
      }
    }
  );

  // Cleanup not needed for global singleton
}

// Initialize immediately
initAuth();

export function useSupabaseAuth() {
  const [state, setState] = useState<AuthState>(globalState);

  useEffect(() => {
    // Sync with global state
    setState(globalState);
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signup = useCallback(async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return useMemo(() => ({ ...state, login, signup, logout }), [state, login, signup, logout]);
}
