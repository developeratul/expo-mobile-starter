import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export function useChatThread(threadId: string | undefined) {
  const thread = useQuery(
    api.chat.queries.getThread,
    threadId ? { threadId } : 'skip',
  );

  return {
    thread,
    isLoading: threadId !== undefined && thread === undefined,
  };
}
