import { useCurrentUser } from '@/features/users';
import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth } from 'convex/react';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthState = {
  status: AuthStatus;
  user: ReturnType<typeof useCurrentUser>['user'];
};

const AuthStateContext = createContext<AuthState | undefined>(undefined);

export function AuthStateProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: convexLoading, isAuthenticated: convexAuthenticated } =
    useConvexAuth();
  const { user } = useCurrentUser();

  const status = useMemo<AuthStatus>(() => {
    if (!isLoaded) return 'loading';
    if (!isSignedIn) return 'unauthenticated';
    if (convexLoading || !convexAuthenticated) return 'loading';
    if (user === undefined) return 'loading';
    return 'authenticated';
  }, [isLoaded, isSignedIn, convexLoading, convexAuthenticated, user]);

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
