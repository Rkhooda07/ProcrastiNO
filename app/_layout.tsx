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

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (!_hasHydrated || !rootNavigationState?.key) return;

    const isAuthenticated = !!session;
    const isAuthGroup = segments[0] === '(auth)'; // Assuming we might put login in an (auth) group, or just check if it's not the main app
    const isLoginPage = segments[0] === 'login' || segments[0] === 'index' && !isAuthenticated;

    if (!isAuthenticated && !isLoginPage) {
      // Redirect to login if not authenticated
      router.replace('/');
    } else if (isAuthenticated && (segments[0] === 'login' || segments.length === 0 || segments[0] === 'index')) {
      // Redirect to tasks if authenticated and on a login/root page
      router.replace('/tasks');
    }
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
