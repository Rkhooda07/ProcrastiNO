import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { scheduleWellnessNotificationsAsync } from '../lib/notifications';

export interface ReminderSettings {
  user_id: string;
  water_interval_min: number;
  posture_interval_min: number;
  water_enabled: boolean;
  posture_enabled: boolean;
}

interface ReminderState {
  settings: ReminderSettings | null;
  isLoading: boolean;
  fetchSettings: (userId: string) => Promise<void>;
  updateSettings: (settings: Partial<ReminderSettings>) => Promise<void>;
}

export const useReminderStore = create<ReminderState>((set, get) => ({
  settings: null,
  isLoading: false,
  fetchSettings: async (userId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from('reminder_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      set({ settings: data, isLoading: false });
      await scheduleWellnessNotificationsAsync(data);
    } else {
      // If no settings, create default ones
      const defaultSettings: ReminderSettings = {
        user_id: userId,
        water_interval_min: 45,
        posture_interval_min: 60,
        water_enabled: true,
        posture_enabled: true,
      };
      await supabase.from('reminder_settings').insert(defaultSettings);
      set({ settings: defaultSettings, isLoading: false });
      await scheduleWellnessNotificationsAsync(defaultSettings);
    }
  },
  updateSettings: async (newSettings) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    const updated = { ...currentSettings, ...newSettings };
    const { error } = await supabase
      .from('reminder_settings')
      .update(newSettings)
      .eq('user_id', currentSettings.user_id);

    if (!error) {
      set({ settings: updated });
      await scheduleWellnessNotificationsAsync(updated);
    }
  },
}));
