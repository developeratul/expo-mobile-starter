import { useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Platform,
  type KeyboardEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useKeyboardBottomInset() {
  const insets = useSafeAreaInsets();
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  useEffect(() => {
    function handleKeyboardShow(event: KeyboardEvent) {
      const windowHeight = Dimensions.get('window').height;
      const keyboardTop = event.endCoordinates.screenY;
      const keyboardOverlap = Math.max(windowHeight - keyboardTop, 0);

      setKeyboardBottomInset(Math.max(keyboardOverlap - insets.bottom, 0));
    }

    function handleKeyboardHide() {
      setKeyboardBottomInset(0);
    }

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow',
      handleKeyboardShow
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      handleKeyboardHide
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [insets.bottom]);

  return keyboardBottomInset;
}
