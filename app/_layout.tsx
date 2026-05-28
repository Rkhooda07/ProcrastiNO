import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { RAKSHIT_ID, SNEH_ID, useUserStore } from '../store/userStore';
import { StatusBar } from 'expo-status-bar';
import {
  addNotificationResponseListener,
  ensureNotificationsReadyAsync,
  getLastNotificationResponseAsync,
} from '../lib/notifications';
import { useReminderStore } from '../store/reminderStore';

export default function RootLayout() {
  const { hasChosenUser, _hasHydrated, currentUserId, resetUser } = useUserStore();
  const segments = useSegments();
  const router = useRouter();
  const fetchReminderSettings = useReminderStore((state) => state.fetchSettings);
  const fetchProfilePics = useUserStore((state) => state.fetchProfilePics);
  const subscribeToProfilePics = useUserStore((state) => state.subscribeToProfilePics);

  useEffect(() => {
    if (!_hasHydrated) return;

    // Force reset if the ID is not a valid UUID (must be 36 characters)
    // This wipes out the old "rakshit-id" and "sneh-id" strings permanently
    if (hasChosenUser && currentUserId && currentUserId.length !== 36) {
      resetUser();
      return;
    }

    const isSelectionPage = segments[0] === 'select-user';

    if (!hasChosenUser && !isSelectionPage) {
      router.replace('/select-user');
    } else if (hasChosenUser && isSelectionPage) {
      router.replace('/tasks');
    }
  }, [hasChosenUser, segments, _hasHydrated]);

  useEffect(() => {
    if (!currentUserId) return;

    void ensureNotificationsReadyAsync().catch((error) => {
      console.warn('Failed to initialize notifications', error);
    });

    void fetchReminderSettings(currentUserId).catch((error) => {
      console.warn('Failed to hydrate reminder settings', error);
    });
  }, [currentUserId, fetchReminderSettings]);

  useEffect(() => {
    if (!_hasHydrated) return;

    const profileIds = [RAKSHIT_ID, SNEH_ID];
    void fetchProfilePics(profileIds);
    return subscribeToProfilePics(profileIds);
  }, [_hasHydrated, fetchProfilePics, subscribeToProfilePics]);

  useEffect(() => {
    const redirectFromNotification = (notification: any) => {
      const url = notification?.request?.content?.data?.url;
      if (typeof url === 'string') {
        router.push(url as '/tasks');
      }
    };

    let active = true;

    void getLastNotificationResponseAsync().then((response) => {
      if (!active) return;
      if (response?.notification) {
        redirectFromNotification(response.notification);
      }
    });

    let subscription: { remove: () => void } | null = null;

    void addNotificationResponseListener((nextResponse) => {
      redirectFromNotification(nextResponse?.notification);
    }).then((nextSubscription) => {
      if (!active) {
        nextSubscription.remove();
        return;
      }
      subscription = nextSubscription;
    });

    return () => {
      active = false;
      subscription?.remove();
    };
  }, [router]);

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
