import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { useAction } from 'convex/react';
import { getCalendars } from 'expo-localization';
import { useMemo, useState } from 'react';

interface SendChatMessageArgs {
  threadId?: Id<'chatThreads'>;
  content: string;
}

export function useSendChatMessage() {
  const sendChatMessage = useAction(api.chat.actions.sendMessage);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(args: SendChatMessageArgs) {
    setIsSending(true);
    setError(null);

    try {
      const userTimezone = getCalendars()[0]?.timeZone ?? 'UTC';
      return await sendChatMessage({
        ...args,
        timezone: userTimezone,
      });
    } catch (sendError) {
      const message = sendError instanceof Error ? sendError.message : 'Failed to send message';
      setError(message);
      throw sendError;
    } finally {
      setIsSending(false);
    }
  }

  return {
    sendMessage,
    isSending,
    error,
  };
}
