import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';
import { useCurrentUser } from './use-current-user';

export function useOnboardingStatus() {
  const { user } = useCurrentUser();
  const completeOnboarding = useMutation(api.users.mutations.completeOnboarding);

  return {
    needsOnboarding: user !== null && user !== undefined && !user.hasCompletedOnboarding,
    completeOnboarding,
  };
}
