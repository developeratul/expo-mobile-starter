import { ScreenWrapper } from '@/components/layout';
import { EmptyState, LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  ChatComposer,
  ChatMessageList,
  useChatMessages,
  useChatThread,
  useKeyboardBottomInset,
  useSendChatMessage,
} from '@/features/chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { History, MessageCirclePlus } from 'lucide-react-native';
import { View } from 'react-native';

export default function ChatThreadScreen() {
  const router = useRouter();
  const { threadId: threadIdParam } = useLocalSearchParams<{ threadId: string }>();
  const threadId = threadIdParam;
  const { thread } = useChatThread(threadId);
  const { messages, isLoading: areMessagesLoading } = useChatMessages(threadId);
  const { sendMessage, isSending, error } = useSendChatMessage();
  const keyboardBottomInset = useKeyboardBottomInset();

  async function handleSendMessage(content: string) {
    if (!thread) return;
    await sendMessage({ threadId: thread._id, content });
  }

  function handleNewChatPress() {
    router.replace('/chat');
  }

  function handleHistoryPress() {
    router.push('/chat-history');
  }

  if (!threadId || thread === undefined) {
    return <LoadingState />;
  }

  if (thread === null) {
    return (
      <ScreenWrapper title="Chat" headerShown>
        <EmptyState
          icon={MessageCirclePlus}
          title="Chat not found"
          description="This conversation may have been archived or removed."
          action={{
            label: 'Start a new chat',
            onPress: handleNewChatPress,
          }}
          className="flex-1"
        />
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper
      title={thread.title ?? 'Claire'}
      headerShown
      headerRight={() => (
        <View className="flex-row gap-1">
          <Button variant="ghost" size="sm" onPress={handleNewChatPress}>
            <Icon as={MessageCirclePlus} size={18} />
            <Text>New</Text>
          </Button>
          <Button variant="ghost" size="sm" onPress={handleHistoryPress}>
            <Icon as={History} size={18} />
          </Button>
        </View>
      )}>
      <View className="flex-1">
        <ChatMessageList messages={messages ?? []} isLoading={areMessagesLoading} />
        {error ? <Text className="px-4 pb-2 text-sm text-destructive">{error}</Text> : null}
        <View className="bg-background" style={{ paddingBottom: keyboardBottomInset }}>
          <ChatComposer onSend={handleSendMessage} isSending={isSending} />
        </View>
      </View>
    </ScreenWrapper>
  );
}
