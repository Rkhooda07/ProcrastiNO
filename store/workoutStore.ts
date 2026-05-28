import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WorkoutProgress {
  workoutId: string;
  exerciseIndex: number;
  timeLeft: number;
  isResting: boolean;
  lastUpdated: string;
}

interface WorkoutState {
  savedProgress: Record<string, WorkoutProgress>;
  saveProgress: (progress: WorkoutProgress) => void;
  clearProgress: (workoutId: string) => void;
  getProgress: (workoutId: string) => WorkoutProgress | undefined;
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set, get) => ({
      savedProgress: {},
      saveProgress: (progress) => {
        set((state) => ({
          savedProgress: {
            ...state.savedProgress,
            [progress.workoutId]: progress,
          },
        }));
      },
      clearProgress: (workoutId) => {
        set((state) => {
          const next = { ...state.savedProgress };
          delete next[workoutId];
          return { savedProgress: next };
        });
      },
      getProgress: (workoutId) => {
        return get().savedProgress[workoutId];
      },
    }),
    {
      name: 'workout-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
