import { ScreenWrapper } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  ChatComposer,
  ChatMessageList,
  useKeyboardBottomInset,
  useSendChatMessage,
} from '@/features/chat';
import { useRouter, type Href } from 'expo-router';
import { History } from 'lucide-react-native';
import { View } from 'react-native';

export default function FreshChatScreen() {
  const router = useRouter();
  const { sendMessage, isSending, error } = useSendChatMessage();
  const keyboardBottomInset = useKeyboardBottomInset();

  async function handleSendMessage(content: string) {
    const result = await sendMessage({ content });
    router.replace(`/chat/${result.threadId}`);
  }

  function handleHistoryPress() {
    router.push('/chat-history');
  }

  return (
    <ScreenWrapper
      title="Claire"
      headerShown
      headerRight={() => (
        <Button variant="ghost" size="sm" onPress={handleHistoryPress}>
          <Icon as={History} size={18} />
          <Text>History</Text>
        </Button>
      )}>
      <View className="flex-1">
        <ChatMessageList messages={[]} isLoading={isSending} />
        {error ? <Text className="px-4 pb-2 text-sm text-destructive">{error}</Text> : null}
        <View className="bg-background" style={{ paddingBottom: keyboardBottomInset }}>
          <ChatComposer onSend={handleSendMessage} isSending={isSending} />
        </View>
      </View>
    </ScreenWrapper>
  );
}
