import { useCurrentUser, useStoreUserEffect } from '@/features/users';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthState = {
  status: AuthStatus;
  user: ReturnType<typeof useCurrentUser>['user'];
};

const AuthStateContext = createContext<AuthState | undefined>(undefined);

/**
 * useStoreUserEffect is the single source of truth for auth state.
 * @see https://docs.convex.dev/auth/database-auth#calling-the-store-user-mutation-from-react
 */
export function AuthStateProvider({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated: userStored } = useStoreUserEffect();
  const { user } = useCurrentUser();

  const status = useMemo<AuthStatus>(() => {
    if (isLoading) return 'loading';
    if (!userStored) return 'unauthenticated';
    if (user === undefined || user === null) return 'loading';
    return 'authenticated';
  }, [isLoading, userStored, user]);

  const authState = useMemo<AuthState>(() => ({ status, user }), [status, user]);

  return (
    <AuthStateContext.Provider value={authState}>{children}</AuthStateContext.Provider>
  );
}

export function useAuthState() {
  const context = useContext(AuthStateContext);
  if (context === undefined) {
    throw new Error('useAuthState must be used within AuthStateProvider');
  }
  return context;
}
