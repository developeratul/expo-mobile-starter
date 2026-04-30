import { api } from '@/convex/_generated/api';
import { useQuery } from 'convex/react';

export function useChatMessages(threadId: string | undefined) {
  const messages = useQuery(
    api.chat.queries.listMessages,
    threadId ? { threadId, limit: 100 } : 'skip',
  );

  return {
    messages,
    isLoading: threadId !== undefined && messages === undefined,
  };
}
