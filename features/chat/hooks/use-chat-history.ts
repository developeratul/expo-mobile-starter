import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export function useChatHistory() {
  const threads = useQuery(api.chat.queries.listThreadHistory, { limit: 50 });

  return {
    threads,
    isLoading: threads === undefined,
  };
}
