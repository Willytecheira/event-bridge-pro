import { useState, useEffect, useSyncExternalStore, useCallback } from 'react';
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

const defaultState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  email: null,
  role: null,
};

// Simple external store for auth state
let currentState: AuthState = { ...defaultState };
const subscribers = new Set<() => void>();

function getSnapshot(): AuthState {
  return currentState;
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function emit(newState: AuthState) {
  currentState = newState;
  subscribers.forEach((cb) => cb());
}

async function resolveRole(userId: string): Promise<'admin' | 'viewer'> {
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

// Initialize auth listener once
let initDone = false;
function ensureInit() {
  if (initDone) return;
  initDone = true;

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      emit({
        user: session.user,
        session,
        isAuthenticated: true,
        isLoading: false,
        email: session.user.email ?? null,
        role: currentState.role,
      });
      // Fetch role in background
      resolveRole(session.user.id).then((role) => {
        emit({ ...currentState, role });
      });
    } else {
      emit({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
        email: null,
        role: null,
      });
    }
  });
}

ensureInit();

export function useSupabaseAuth() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

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

  return { ...state, login, signup, logout };
}
