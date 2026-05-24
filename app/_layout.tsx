import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useUserStore } from '../store/userStore';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const { hasChosenUser } = useUserStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const isSelectionPage = segments[0] === 'select-user';

    if (!hasChosenUser && !isSelectionPage) {
      router.replace('/select-user');
    } else if (hasChosenUser && isSelectionPage) {
      router.replace('/tasks');
    }
  }, [hasChosenUser, segments]);

  return (
    <>
      <StatusBar style="dark" />
      <Slot />
    </>
  );
}
