import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
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
  const rootNavigationState = useRootNavigationState();
  const fetchReminderSettings = useReminderStore((state) => state.fetchSettings);
  const fetchProfilePics = useUserStore((state) => state.fetchProfilePics);
  const subscribeToProfilePics = useUserStore((state) => state.subscribeToProfilePics);

  const [navigationReady, setNavigationReady] = useState(false);

  useEffect(() => {
    if (rootNavigationState?.key) {
      setNavigationReady(true);
    }
  }, [rootNavigationState?.key]);

  useEffect(() => {
    if (!navigationReady || !_hasHydrated) return;

    // Force reset if the ID is not a valid UUID (must be 36 characters)
    if (hasChosenUser && currentUserId && currentUserId.length !== 36) {
      resetUser();
      return;
    }

    const inSelectionGroup = segments[0] === 'select-user';
    const isAtRoot = segments.length === 0 || (segments.length === 1 && segments[0] === '');

    if (!hasChosenUser && !inSelectionGroup) {
      setTimeout(() => {
        router.replace('/select-user');
      }, 10);
    } else if (hasChosenUser && (inSelectionGroup || isAtRoot)) {
      setTimeout(() => {
        router.replace('/tasks');
      }, 10);
    }
  }, [navigationReady, _hasHydrated, hasChosenUser, segments, currentUserId]);

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
    if (!rootNavigationState?.key) return;

    const redirectFromNotification = (notification: any) => {
      const url = notification?.request?.content?.data?.url;
      if (typeof url === 'string') {
        setTimeout(() => {
          if (navigationReady) {
            router.push(url as any);
          }
        }, 10);
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
  }, [router, rootNavigationState?.key]);

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
