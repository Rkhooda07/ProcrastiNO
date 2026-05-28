import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useUserStore } from '../store/userStore';

export default function Index() {
  const { hasChosenUser, _hasHydrated } = useUserStore();
  const router = useRouter();

  useEffect(() => {
    if (!_hasHydrated) return;
    router.replace(hasChosenUser ? '/tasks' : '/select-user');
  }, [_hasHydrated, hasChosenUser, router]);

  return null;
}
