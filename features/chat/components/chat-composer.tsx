import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { ArrowUp } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

interface ChatComposerProps {
  onSend: (content: string) => Promise<void> | void;
  isSending?: boolean;
}

export function ChatComposer({ onSend, isSending }: ChatComposerProps) {
  const [content, setContent] = useState('');

  async function handleSendPress() {
    const trimmedContent = content.trim();
    if (!trimmedContent || isSending) return;

    setContent('');
    await onSend(trimmedContent);
  }

  return (
    <View className="flex-row items-center gap-2 px-3 py-3">
      <View className="min-h-14 flex-1 flex-row items-center gap-2 rounded-full bg-muted px-2 py-2">
        <Input
          value={content}
          onChangeText={setContent}
          editable={!isSending}
          placeholder="Message Claire..."
          multiline={false}
          numberOfLines={3}
          textAlignVertical="center"
          className="min-h-full flex-1 border-0 bg-transparent px-0 py-0 pl-2 shadow-none dark:bg-transparent"
        />
        <Button
          onPress={handleSendPress}
          isLoading={isSending}
          disabled={!content.trim() || isSending}
          size="icon"
          className="h-10 w-10 rounded-full bg-foreground text-background active:bg-foreground/90">
          <Icon as={ArrowUp} className="text-background" size={20} />
        </Button>
      </View>
    </View>
  );
}
