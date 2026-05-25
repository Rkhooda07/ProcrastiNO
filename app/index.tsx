import { Redirect } from 'expo-router';
import { useUserStore } from '../store/userStore';

export default function Index() {
  const { hasChosenUser, _hasHydrated } = useUserStore();

  if (!_hasHydrated) return null;

  if (!hasChosenUser) {
    return <Redirect href="/select-user" />;
  }
  
  return <Redirect href="/tasks" />;
}
