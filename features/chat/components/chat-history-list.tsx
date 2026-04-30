import { EmptyState } from '@/components/shared';
import { Text } from '@/components/ui/text';
import type { Id } from '@/convex/_generated/dataModel';
import { FlashList } from '@shopify/flash-list';
import { History } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

type ChatThread = {
  _id: Id<'chatThreads'>;
  title?: string;
  lastMessageAt?: number;
};

interface ChatHistoryListProps {
  threads: ChatThread[];
  onThreadPress: (threadId: Id<'chatThreads'>) => void;
}

export function ChatHistoryList({ threads, onThreadPress }: ChatHistoryListProps) {
  if (threads.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No chat history yet"
        description="Your saved conversations will appear here after you start chatting."
        className="flex-1"
      />
    );
  }

  return (
    <FlashList
      data={threads}
      keyExtractor={(thread) => thread._id}
      renderItem={({ item }) => (
        <ChatHistoryItem thread={item} onPress={onThreadPress} />
      )}
      contentContainerClassName="p-4"
    />
  );
}

function ChatHistoryItem({
  thread,
  onPress,
}: {
  thread: ChatThread;
  onPress: (threadId: Id<'chatThreads'>) => void;
}) {
  return (
    <Pressable
      className="mb-3 rounded-xl border border-border bg-card p-4 active:bg-muted"
      onPress={() => onPress(thread._id)}>
      <View className="gap-1">
        <Text className="font-semibold">{thread.title ?? 'Untitled chat'}</Text>
        {thread.lastMessageAt ? (
          <Text className="text-sm text-muted-foreground">
            {formatThreadTime(thread.lastMessageAt)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function formatThreadTime(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp));
}
