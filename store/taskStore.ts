import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export interface Task {
  id: string;
  owner_id: string;
  title: string;
  date: string;
  is_done: boolean;
  is_recurring: boolean;
  done_at: string | null;
  created_at: string;
}

interface TaskState {
  tasks: Task[];
  isLoading: boolean;
  completedDates: string[]; 
  pendingSync: Set<string>; // Track tasks currently syncing to DB
  fetchTasks: (userId: string, pairUserId: string | null) => Promise<void>;
  toggleTask: (taskId: string, isDone: boolean) => Promise<void>;
  addTask: (title: string, ownerId: string) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  makeRecurring: (taskId: string, recurring: boolean) => Promise<void>;
  fetchStreakData: (userId: string) => Promise<void>;
  subscribeToTasks: (userId: string, pairUserId: string | null) => () => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  isLoading: false,
  completedDates: [],
  pendingSync: new Set(),
  fetchTasks: async (userId, pairUserId) => {
    set({ isLoading: true });
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('tasks')
      .select('*')
      .or(`date.eq.${today},is_recurring.eq.true`);

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
    
    get().fetchStreakData(userId);
  },
  fetchStreakData: async (userId) => {
    const { data } = await supabase
      .from('tasks')
      .select('date, is_done')
      .eq('owner_id', userId);

    if (data) {
      const datesGrouped: { [key: string]: { total: number, done: number } } = {};
      data.forEach(t => {
        if (!datesGrouped[t.date]) datesGrouped[t.date] = { total: 0, done: 0 };
        datesGrouped[t.date].total++;
        if (t.is_done) datesGrouped[t.date].done++;
      });

      const completed = Object.keys(datesGrouped).filter(d => 
        datesGrouped[d].total > 0 && datesGrouped[d].total === datesGrouped[d].done
      );
      
      set({ completedDates: completed });
    }
  },
  toggleTask: async (taskId, isDone) => {
    const done_at = isDone ? new Date().toISOString() : null;
    
    // 1. Instant UI update (Optimistic)
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, is_done: isDone, done_at } : t
      ),
      // Prevent realtime jitter by locking this ID
      pendingSync: new Set(state.pendingSync).add(taskId)
    }));

    // 2. Sync with database
    await supabase
      .from('tasks')
      .update({ is_done: isDone, done_at })
      .eq('id', taskId);

    // 3. Unlock after delay
    setTimeout(() => {
      set((state) => {
        const next = new Set(state.pendingSync);
        next.delete(taskId);
        return { pendingSync: next };
      });
    }, 1500);
  },
  makeRecurring: async (taskId, is_recurring) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId ? { ...t, is_recurring } : t
      ),
    }));
    await supabase.from('tasks').update({ is_recurring }).eq('id', taskId);
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
      is_recurring: false,
      done_at: null,
      created_at: new Date().toISOString()
    };

    set((state) => ({ 
      tasks: [...state.tasks, newTask],
      pendingSync: new Set(state.pendingSync).add(tempId)
    }));

    const { data } = await supabase
      .from('tasks')
      .insert({ title, owner_id: ownerId, date: today, is_done: false })
      .select()
      .single();

    if (data) {
      set((state) => ({
        tasks: state.tasks.map(t => t.id === tempId ? data : t)
      }));
    }

    setTimeout(() => {
      set((state) => {
        const next = new Set(state.pendingSync);
        next.delete(tempId);
        if (data) next.delete(data.id);
        return { pendingSync: next };
      });
    }, 1500);
  },
  deleteTask: async (taskId) => {
    set((state) => ({ tasks: state.tasks.filter(t => t.id !== taskId) }));
    await supabase.from('tasks').delete().eq('id', taskId);
  },
  subscribeToTasks: (userId, pairUserId) => {
    const today = new Date().toISOString().split('T')[0];
    const channel = supabase
      .channel('tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `date=eq.${today}` },
        (payload) => {
          const newTask = payload.new as Task;
          const oldTask = payload.old as { id: string };
          
          // SENIOR FIX: If we are currently syncing this task, IGNORE the database update
          // This stops the "flickering" or "jittering" when you click fast.
          if (get().pendingSync.has(newTask?.id || oldTask?.id)) return;

          if (payload.eventType === 'INSERT') {
             if (newTask.owner_id === userId || newTask.owner_id === pairUserId) {
                set((state) => {
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
    return () => supabase.removeChannel(channel);
  },
}));