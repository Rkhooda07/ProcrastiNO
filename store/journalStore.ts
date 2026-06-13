import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JournalEntry {
  id: string;
  date: string; // ISO string
  mediaUri?: string;
  note?: string;
}

interface JournalState {
  entries: JournalEntry[];
  activeDates: string[]; // ['YYYY-MM-DD', ...]
  streak: number;
  addEntry: (entry: Partial<JournalEntry>) => void;
  updateEntry: (id: string, entry: Partial<JournalEntry>) => void;
  markActive: () => void;
  calculateStreak: () => void;
}

const getTodayStr = () => new Date().toISOString().split('T')[0];

export const useJournalStore = create<JournalState>()(
  persist(
    (set, get) => ({
      entries: [],
      activeDates: [],
      streak: 0,
      addEntry: (entry) => {
        const newEntry = { 
          id: Math.random().toString(36).substring(7), 
          date: new Date().toISOString(), 
          ...entry 
        };
        set((state) => ({
          entries: [...state.entries, newEntry],
        }));
        get().markActive();
      },
      updateEntry: (id, updatedEntry) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updatedEntry } : entry
          ),
        })),
      markActive: () => {
        const todayStr = getTodayStr();
        const { activeDates } = get();
        if (!activeDates.includes(todayStr)) {
          set((state) => ({
            activeDates: [...state.activeDates, todayStr],
          }));
          get().calculateStreak();
        }
      },
      calculateStreak: () => {
        const { activeDates } = get();
        if (activeDates.length === 0) {
          set({ streak: 0 });
          return;
        }

        const sorted = [...new Set(activeDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const todayStr = today.toISOString().split('T')[0];
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // If last active was not today or yesterday, streak is broken
        if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) {
          set({ streak: 0 });
          return;
        }

        let currentStreak = 0;
        let lastDate = new Date(sorted[0]);

        for (let i = 0; i < sorted.length; i++) {
          const d = new Date(sorted[i]);
          if (i === 0) {
            currentStreak = 1;
          } else {
            const expected = new Date(lastDate);
            expected.setDate(expected.getDate() - 1);
            if (d.toISOString().split('T')[0] === expected.toISOString().split('T')[0]) {
              currentStreak++;
              lastDate = d;
            } else {
              break;
            }
          }
        }
        set({ streak: currentStreak });
      },
    }),
    {
      name: 'journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
