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
  addTask: (title: string, ownerId: string) => Promise<void>;
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
  addTask: async (title, ownerId) => {
    const today = new Date().toISOString().split('T')[0];
    const tempId = Math.random().toString(36).substring(7);
    
    const newTask: Task = {
      id: tempId,
      owner_id: ownerId,
      title,
      date: today,
      is_done: false,
      done_at: null,
      created_at: new Date().toISOString()
    };

    // Optimistically add to state
    set((state) => ({ tasks: [...state.tasks, newTask] }));

    const { data, error } = await supabase
      .from('tasks')
      .insert({ title, owner_id: ownerId, date: today, is_done: false })
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      // Rollback on error
      set((state) => ({ tasks: state.tasks.filter(t => t.id !== tempId) }));
    } else if (data) {
      // Replace temp task with real one from DB, but only if listener hasn't added it yet
      set((state) => {
        const alreadyAddedByListener = state.tasks.some(t => t.id === data.id);
        if (alreadyAddedByListener) {
          return { tasks: state.tasks.filter(t => t.id !== tempId) };
        }
        return {
          tasks: state.tasks.map(t => t.id === tempId ? data : t)
        };
      });
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
                set((state) => {
                  // Prevent duplicates if already added by addTask
                  if (state.tasks.some(t => t.id === newTask.id)) return state;
                  return { tasks: [...state.tasks, newTask] };
                });
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
