import { api } from '@/convex/_generated/api';
import { useMutation } from 'convex/react';

export function useUpdateDisplayName() {
  const updateDisplayName = useMutation(api.users.mutations.updateDisplayName);
  
  return {
    updateDisplayName,
  };
}
