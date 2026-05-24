import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Fixed IDs for the 2 users
export const USER_A_ID = 'user-alpha-unique-id';
export const USER_B_ID = 'user-beta-unique-id';

interface UserState {
  currentUserId: string | null;
  partnerId: string | null;
  hasChosenUser: boolean;
  setUser: (id: string) => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      currentUserId: null,
      partnerId: null,
      hasChosenUser: false,
      setUser: (id: string) => {
        const partnerId = id === USER_A_ID ? USER_B_ID : USER_A_ID;
        set({ currentUserId: id, partnerId, hasChosenUser: true });
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
