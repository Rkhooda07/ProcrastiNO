import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

// Fixed IDs for the 2 users (MUST be valid UUIDs for Supabase)
export const RAKSHIT_ID = '8b693895-7145-4202-8692-06992f7682f6';
export const SNEH_ID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

interface UserState {
  currentUserId: string | null;
  currentUserName: string | null;
  partnerId: string | null;
  partnerName: string | null;
  profilePics: Record<string, string>; // { [userId]: uri }
  hasChosenUser: boolean;
  _hasHydrated: boolean;
  setUser: (id: string) => Promise<void>;
  setProfilePic: (userId: string, uri: string) => void;
  resetUser: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUserId: null,
      currentUserName: null,
      partnerId: null,
      partnerName: null,
      profilePics: {},
      hasChosenUser: false,
      _hasHydrated: false,
      setUser: async (id: string) => {
        const isRakshit = id === RAKSHIT_ID;
        const currentUserName = isRakshit ? 'Rakshit' : 'Sneh';
        const partnerId = isRakshit ? SNEH_ID : RAKSHIT_ID;
        const partnerName = isRakshit ? 'Sneh' : 'Rakshit';

        set({ 
          currentUserId: id, 
          currentUserName, 
          partnerId, 
          partnerName, 
          hasChosenUser: true 
        });

        // Seed stats in the background so profile selection feels instant.
        void Promise.all([
          supabase.from('user_stats').upsert({ user_id: id }, { onConflict: 'user_id' }),
          supabase.from('user_stats').upsert({ user_id: partnerId }, { onConflict: 'user_id' }),
        ]).catch((error) => {
          console.warn('Failed to seed user stats', error);
        });
      },
      setProfilePic: (userId, uri) => {
        set((state) => ({
          profilePics: { ...state.profilePics, [userId]: uri }
        }));
      },
      resetUser: () => {
        set({ 
          currentUserId: null, 
          currentUserName: null, 
          partnerId: null, 
          partnerName: null, 
          hasChosenUser: false 
        });
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'user-storage-v2', // Changed from 'user-storage' to force a clean slate
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
