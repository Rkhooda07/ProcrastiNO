import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const { hasChosenUser, _hasHydrated, currentUserId, resetUser } = useUserStore();
  const segments = useSegments();
  const router = useRouter();

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

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
