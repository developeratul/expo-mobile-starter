import { EmptyState, LoadingState } from '@/components/shared';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Id } from '@/convex/_generated/dataModel';
import { cn } from '@/lib/utils';
import { FlashList } from '@shopify/flash-list';
import { Bot, MessageCircle } from 'lucide-react-native';
import { View } from 'react-native';

type ChatMessage = {
  _id: Id<'chatMessages'>;
  role: 'user' | 'assistant' | 'system';
  content: string;
};

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function ChatMessageList({ messages, isLoading }: ChatMessageListProps) {
  if (isLoading && messages.length === 0) {
    return <LoadingState />;
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={MessageCircle}
        title="Start a fresh chat"
        description="Ask Claire to log an expense or summarize your spending."
        className="flex-1"
      />
    );
  }

  return (
    <FlashList
      data={messages}
      style={{ flex: 1 }}
      keyExtractor={(message) => message._id}
      getItemType={(message) => message.role}
      renderItem={({ item }) => <ChatMessageBubble message={item} />}
      contentContainerClassName="px-4 py-3"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      maintainVisibleContentPosition={{
        autoscrollToBottomThreshold: 0.2,
        startRenderingFromBottom: true,
      }}
    />
  );
}

function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <View
      className={cn(
        'mb-3 max-w-[85%] rounded-2xl px-4 py-3',
        isUser ? 'self-end rounded-br-sm bg-primary' : 'self-start rounded-bl-sm bg-muted'
      )}>
      {!isUser && (
        <View className="mb-1 flex-row items-center gap-2">
          <Icon as={Bot} className="text-muted-foreground" size={14} />
          <Text className="font-medium text-xs text-muted-foreground">Claire</Text>
        </View>
      )}
      <Text className={cn('text-sm leading-5', isUser && 'text-primary-foreground')}>
        {message.content}
      </Text>
    </View>
  );
}
