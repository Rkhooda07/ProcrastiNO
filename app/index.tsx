import { useEffect } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useUserStore } from '../store/userStore';

export default function Index() {
  const { hasChosenUser, _hasHydrated } = useUserStore();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();

  useEffect(() => {
    if (!_hasHydrated || !rootNavigationState?.key) return;
    router.replace(hasChosenUser ? '/tasks' : '/select-user');
  }, [_hasHydrated, hasChosenUser, router, rootNavigationState?.key]);

  return null;
}
