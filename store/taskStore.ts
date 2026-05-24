import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Task {
  id: string;
  owner_id: string;
  title: string;
  date: string;
  is_done: boolean;
  done_at: string | null;
  created_at: string;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  fetchTasks: (userId: string, pairUserId: string | null) => Promise<void>;
  toggleTask: (taskId: string, isDone: boolean) => Promise<void>;
  subscribeToTasks: (userId: string, pairUserId: string | null) => () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  fetchTasks: async (userId, pairUserId) => {
    set({ isLoading: true });
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('date', today);

    if (pairUserId) {
      query = query.or(`owner_id.eq.${userId},owner_id.eq.${pairUserId}`);
    } else {
      query = query.eq('owner_id', userId);
    }

    const { data, error } = await query;
    if (data) {
      set({ tasks: data, isLoading: false });
    } else {
      set({ isLoading: false });
    }
  },
  toggleTask: async (taskId, isDone) => {
    const done_at = isDone ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('tasks')
      .update({ is_done: isDone, done_at })
      .eq('id', taskId);

    if (!error) {
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === taskId ? { ...t, is_done: isDone, done_at } : t
        ),
      }));
    }
  },
  subscribeToTasks: (userId, pairUserId) => {
    const today = new Date().toISOString().split('T')[0];
    
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `date=eq.${today}`,
        },
        (payload) => {
          const newTask = payload.new as Task;
          const oldTask = payload.old as { id: string };

          if (payload.eventType === 'INSERT') {
             if (newTask.owner_id === userId || newTask.owner_id === pairUserId) {
                set((state) => ({ tasks: [...state.tasks, newTask] }));
             }
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              tasks: state.tasks.map((t) => (t.id === newTask.id ? newTask : t)),
            }));
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              tasks: state.tasks.filter((t) => t.id !== oldTask.id),
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
