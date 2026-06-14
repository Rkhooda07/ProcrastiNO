import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface JournalEntry {
  id: string;
  date: string;
  note?: string;
  mediaUri?: string;
  tags?: string[];
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

const getTodayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const performStreakCalculation = (activeDates: string[]) => {
  if (activeDates.length === 0) return 0;

  const sorted = [...new Set(activeDates)].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  const todayStr = getTodayStr();
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const y_year = yesterdayDate.getFullYear();
  const y_month = String(yesterdayDate.getMonth() + 1).padStart(2, '0');
  const y_day = String(yesterdayDate.getDate()).padStart(2, '0');
  const yesterdayStr = `${y_year}-${y_month}-${y_day}`;

  // If last active was not today or yesterday, streak is broken
  if (sorted[0] !== todayStr && sorted[0] !== yesterdayStr) {
    return 0;
  }

  let currentStreak = 0;
  let lastDateStr = sorted[0];

  for (let i = 0; i < sorted.length; i++) {
    const dStr = sorted[i];
    if (i === 0) {
      currentStreak = 1;
      lastDateStr = dStr;
    } else {
      // Calculate expected date (lastDate - 1 day) using manual string manipulation to stay in local time
      const [year, month, day] = lastDateStr.split('-').map(Number);
      const prevDate = new Date(year, month - 1, day);
      prevDate.setDate(prevDate.getDate() - 1);
      
      const py = prevDate.getFullYear();
      const pm = String(prevDate.getMonth() + 1).padStart(2, '0');
      const pd = String(prevDate.getDate()).padStart(2, '0');
      const expectedStr = `${py}-${pm}-${pd}`;

      if (dStr === expectedStr) {
        currentStreak++;
        lastDateStr = dStr;
      } else {
        break;
      }
    }
  }
  return currentStreak;
};

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
        
        const todayStr = getTodayStr();
        const { activeDates, entries } = get();
        
        let nextActiveDates = activeDates;
        let nextStreak = get().streak;
        
        if (!activeDates.includes(todayStr)) {
          nextActiveDates = [...activeDates, todayStr];
          nextStreak = performStreakCalculation(nextActiveDates);
        }

        set({
          entries: [...entries, newEntry],
          activeDates: nextActiveDates,
          streak: nextStreak
        });
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
          const nextActiveDates = [...activeDates, todayStr];
          const nextStreak = performStreakCalculation(nextActiveDates);
          set({ 
            activeDates: nextActiveDates, 
            streak: nextStreak 
          });
        } else {
          // Even if already marked, recalculate streak to ensure it's up to date with the current "today"
          const currentStreak = performStreakCalculation(activeDates);
          if (currentStreak !== get().streak) {
            set({ streak: currentStreak });
          }
        }
      },
      calculateStreak: () => {
        const { activeDates } = get();
        set({ streak: performStreakCalculation(activeDates) });
      },
    }),
    {
      name: 'journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
