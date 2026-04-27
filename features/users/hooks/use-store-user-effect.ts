import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useUser } from '@clerk/clerk-expo';
import { useConvexAuth, useMutation } from 'convex/react';
import { useEffect, useState } from 'react';

/**
 * @see https://docs.convex.dev/auth/database-auth#calling-the-store-user-mutation-from-react
 */
export function useStoreUserEffect() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { user } = useUser();
  const [userId, setUserId] = useState<Id<'users'> | null>(null);
  const storeUser = useMutation(api.users.mutations.store);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    async function createUser() {
      const id = await storeUser();
      setUserId(id);
    }

    void createUser();
    return () => setUserId(null);
  }, [isAuthenticated, storeUser, user?.id]);

  return {
    isLoading: isLoading || (isAuthenticated && userId === null),
    isAuthenticated: isAuthenticated && userId !== null,
  };
}
