import { ScreenWrapper } from '@/components/layout';
import { LoadingState } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { Id } from '@/convex/_generated/dataModel';
import { ChatHistoryList, useChatHistory } from '@/features/chat';
import { useRouter } from 'expo-router';
import { MessageCirclePlus } from 'lucide-react-native';

export default function ChatHistoryScreen() {
  const router = useRouter();
  const { threads, isLoading } = useChatHistory();

  function handleThreadPress(threadId: Id<'chatThreads'>) {
    router.push(`/chat/${threadId}`);
  }

  function handleNewChatPress() {
    router.replace('/chat');
  }

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <ScreenWrapper
      title="Chat history"
      headerShown
      headerRight={() => (
        <Button variant="ghost" size="sm" onPress={handleNewChatPress}>
          <Icon as={MessageCirclePlus} size={18} />
          <Text>New</Text>
        </Button>
      )}>
      <ChatHistoryList threads={threads ?? []} onThreadPress={handleThreadPress} />
    </ScreenWrapper>
  );
}
