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
  streak: number;
  addEntry: (entry: Partial<JournalEntry>) => void;
  updateEntry: (id: string, entry: Partial<JournalEntry>) => void;
}

export const useJournalStore = create<JournalState>()(
  persist(
    (set) => ({
      entries: [],
      streak: 0,
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            ...state.entries,
            { id: Math.random().toString(36).substring(7), date: new Date().toISOString(), ...entry },
          ],
        })),
      updateEntry: (id, updatedEntry) =>
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id ? { ...entry, ...updatedEntry } : entry
          ),
        })),
    }),
    {
      name: 'journal-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
