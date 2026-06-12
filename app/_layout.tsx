import { useEffect } from 'react';
import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { StatusBar } from 'expo-status-bar';
import {
  addNotificationResponseListener,
  ensureNotificationsReadyAsync,
  getLastNotificationResponseAsync,
} from '../lib/notifications';
import { useReminderStore } from '../store/reminderStore';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const { session, _hasHydrated, setSession } = useUserStore();
  const segments = useSegments();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const fetchReminderSettings = useReminderStore((state) => state.fetchSettings);
  const fetchProfilePics = useUserStore((state) => state.fetchProfilePics);
  const subscribeToProfilePics = useUserStore((state) => state.subscribeToProfilePics);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!_hasHydrated || !rootNavigationState?.key) return;

    const isAuthenticated = !!session;
    const firstSegment = segments[0] as string | undefined;
    const isLoginPage = firstSegment === undefined || firstSegment === 'index';

    // Use a small delay to ensure navigation is ready and avoid state updates during render
    const timer = setTimeout(() => {
      if (!isAuthenticated && !isLoginPage) {
        router.replace('/');
      } else if (isAuthenticated && isLoginPage) {
        router.replace('/tasks');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [session, segments, _hasHydrated, rootNavigationState?.key]);

  useEffect(() => {
    if (!session?.user?.id) return;

    void ensureNotificationsReadyAsync().catch((error) => {
      console.warn('Failed to initialize notifications', error);
    });

    void fetchReminderSettings(session.user.id).catch((error) => {
      console.warn('Failed to hydrate reminder settings', error);
    });
  }, [session?.user?.id, fetchReminderSettings]);

  useEffect(() => {
    if (!_hasHydrated || !session?.user?.id) return;

    const profileIds = [session.user.id];
    void fetchProfilePics(profileIds);
    return subscribeToProfilePics(profileIds);
  }, [_hasHydrated, session?.user?.id, fetchProfilePics, subscribeToProfilePics]);

  useEffect(() => {
    if (!rootNavigationState?.key) return;

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
  }, [router, rootNavigationState?.key]);

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
