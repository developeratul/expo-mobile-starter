import { OtpInput as RNOtpInput, type OtpInputProps as RNOtpInputProps } from 'react-native-otp-entry';
import { StyleSheet } from 'react-native';

interface OtpInputProps extends Omit<RNOtpInputProps, 'theme' | 'focusColor'> {
  disabled?: boolean;
}

function OtpInput({ numberOfDigits = 6, disabled = false, ...props }: OtpInputProps) {
  return (
    <RNOtpInput
      numberOfDigits={numberOfDigits}
      disabled={disabled}
      theme={{
        containerStyle: styles.container,
        pinCodeContainerStyle: disabled ? styles.pinCodeContainerDisabled : styles.pinCodeContainer,
        pinCodeTextStyle: styles.pinCodeText,
        focusedPinCodeContainerStyle: styles.focusedPinCodeContainer,
      }}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  pinCodeContainer: {
    height: 48,
    width: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'hsl(var(--input))',
    backgroundColor: 'hsl(var(--background))',
  },
  pinCodeContainerDisabled: {
    height: 48,
    width: 48,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'hsl(var(--input))',
    backgroundColor: 'hsl(var(--background))',
    opacity: 0.5,
  },
  pinCodeText: {
    fontSize: 20,
    color: 'hsl(var(--foreground))',
  },
  focusedPinCodeContainer: {
    borderColor: 'hsl(var(--ring))',
    borderWidth: 2,
  },
});

export { OtpInput };
