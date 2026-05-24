import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  pair: any | null;
  isLoading: boolean;
  setSession: (session: Session | null) => void;
  fetchPair: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  pair: null,
  isLoading: true,
  setSession: (session) => {
    set({ session, user: session?.user ?? null, isLoading: false });
    if (session) {
      get().fetchPair();
    }
  },
  fetchPair: async () => {
    const user = get().user;
    if (!user) return;

    const { data, error } = await supabase
      .from('pairs')
      .select('*')
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .single();

    if (data) {
      set({ pair: data });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, pair: null });
  },
}));
