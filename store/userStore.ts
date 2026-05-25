import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fixed IDs for the 2 users
export const RAKSHIT_ID = 'rakshit-id';
export const SNEH_ID = 'sneh-id';

interface UserState {
  currentUserId: string | null;
  currentUserName: string | null;
  partnerId: string | null;
  partnerName: string | null;
  hasChosenUser: boolean;
  _hasHydrated: boolean;
  setUser: (id: string) => void;
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
      hasChosenUser: false,
      _hasHydrated: false,
      setUser: (id: string) => {
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
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
