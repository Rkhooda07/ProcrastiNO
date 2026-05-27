import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

type ReminderSettingsInput = {
  water_interval_min: number;
  posture_interval_min: number;
  water_enabled: boolean;
  posture_enabled: boolean;
};

type TaskReminderInput = {
  ownerName?: string | null;
  tasks: Array<{
    id: string;
    title: string;
    date: string;
    is_done: boolean;
    is_recurring: boolean;
  }>;
};

const WELLNESS_CHANNEL_ID = 'wellness-reminders';
const TASK_CHANNEL_ID = 'task-reminders';
const WELLNESS_NOTIFICATION_KEY = 'scheduled-wellness-notifications';
const TASK_NOTIFICATION_KEY = 'scheduled-task-notifications';
const TASK_REMINDER_URL = '/tasks';

let notificationsModulePromise: Promise<any | null> | null = null;

function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

async function getNotificationsModule() {
  if (Platform.OS === 'web' || isExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = Promise.resolve()
      .then(() => {
        const module = require('expo-notifications');
        module.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
        return module;
      })
      .catch((error) => {
        console.warn('Failed to load notifications module', error);
        return null;
      });
  }

  return notificationsModulePromise;
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function toDateAtTime(base: Date, hour: number, minute: number) {
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function saveScheduledIds(key: string, ids: string[]) {
  await AsyncStorage.setItem(key, JSON.stringify(ids));
}

async function readScheduledIds(key: string) {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

async function cancelScheduledGroup(key: string) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const ids = await readScheduledIds(key);
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => null)));
  await AsyncStorage.removeItem(key);
}

async function configureChannelsAsync() {
  const Notifications = await getNotificationsModule();
  if (Platform.OS !== 'android') return;
  if (!Notifications) return;

  await Notifications.setNotificationChannelAsync(WELLNESS_CHANNEL_ID, {
    name: 'Wellness reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 150, 250],
    lightColor: '#5DCAA5',
  });

  await Notifications.setNotificationChannelAsync(TASK_CHANNEL_ID, {
    name: 'Task reminders',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 300, 180, 300],
    lightColor: '#A89AE6',
  });
}

export async function ensureNotificationsReadyAsync() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return false;
  }

  await configureChannelsAsync();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === 'granted') {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync();
  return requested.status === 'granted';
}

export async function scheduleWellnessNotificationsAsync(
  settings: ReminderSettingsInput | null
) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelScheduledGroup(WELLNESS_NOTIFICATION_KEY);

  if (!settings) return;

  const hasPermission = await ensureNotificationsReadyAsync();
  if (!hasPermission) return;

  const ids: string[] = [];

  if (settings.water_enabled) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Water break',
        body: 'Drink a glass of water and stay sharp.',
        sound: 'default',
        data: { kind: 'water', url: TASK_REMINDER_URL },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, settings.water_interval_min * 60),
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: WELLNESS_CHANNEL_ID } : {}),
      },
    });
    ids.push(id);
  }

  if (settings.posture_enabled) {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Posture check',
        body: 'Straighten up, relax your shoulders, and reset your focus.',
        sound: 'default',
        data: { kind: 'posture', url: TASK_REMINDER_URL },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, settings.posture_interval_min * 60),
        repeats: true,
        ...(Platform.OS === 'android' ? { channelId: WELLNESS_CHANNEL_ID } : {}),
      },
    });
    ids.push(id);
  }

  await saveScheduledIds(WELLNESS_NOTIFICATION_KEY, ids);
}

export async function scheduleTaskReminderNotificationsAsync({
  ownerName,
  tasks,
}: TaskReminderInput) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelScheduledGroup(TASK_NOTIFICATION_KEY);

  const hasPermission = await ensureNotificationsReadyAsync();
  if (!hasPermission) return;

  const today = todayString();
  const pendingTasks = tasks.filter(
    (task) => !task.is_done && (task.date === today || task.is_recurring)
  );

  if (pendingTasks.length === 0) return;

  const now = new Date();
  const dayStart = toDateAtTime(now, 10, 0);
  const dayEnd = toDateAtTime(now, 21, 30);
  const earliest = new Date(now.getTime() + 20 * 60 * 1000);
  const reminderStart = new Date(Math.max(dayStart.getTime(), earliest.getTime()));

  if (reminderStart >= dayEnd) return;

  const minimumGapMs = 60 * 60 * 1000;
  const spanMs = dayEnd.getTime() - reminderStart.getTime();
  const maxRemindersByGap = Math.max(1, Math.floor(spanMs / minimumGapMs));
  const reminderCount = Math.min(pendingTasks.length, maxRemindersByGap, 10);

  if (reminderCount <= 0) return;

  const stepMs = spanMs / (reminderCount + 1);
  const titlePrefix = ownerName ? `${ownerName}, ` : '';
  const ids: string[] = [];

  for (let index = 1; index <= reminderCount; index += 1) {
    const triggerDate = new Date(reminderStart.getTime() + stepMs * index);
    const remainingCount = pendingTasks.length;
    const taskWord = remainingCount === 1 ? 'task' : 'tasks';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${titlePrefix}${remainingCount} ${taskWord} still waiting`,
        body:
          index === 1
            ? 'Start chipping away at today’s list.'
            : 'Keep the momentum going and finish a few more today.',
        sound: 'default',
        data: { kind: 'tasks', url: TASK_REMINDER_URL, pendingCount: remainingCount },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        ...(Platform.OS === 'android' ? { channelId: TASK_CHANNEL_ID } : {}),
      },
    });

    ids.push(id);
  }

  await saveScheduledIds(TASK_NOTIFICATION_KEY, ids);
}

export async function getLastNotificationResponseAsync() {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return null;
  return Notifications.getLastNotificationResponseAsync();
}

export async function addNotificationResponseListener(
  listener: (response: any) => void
) {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return { remove() {} };
  }

  return Notifications.addNotificationResponseReceivedListener(listener);
}
