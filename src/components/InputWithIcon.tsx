import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  KeyboardTypeOptions,
} from 'react-native';
import { EyeIcon, EyeOffIcon } from './icons/AuthIcons';

type Props = {
  label?: string;
  placeholder?: string;
  value: string;
  onInputChange?: (value: string) => void;
  icon?: React.ReactNode;
  isPassword?: boolean;
  type?: 'text' | 'email' | 'password' | 'number';
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  disabled?: boolean;
  hasError?: boolean;
  errorMessage?: string;
  containerStyle?: ViewStyle;
  maxLength?: number;
  onSubmitEditing?: () => void;
  returnKeyType?: 'done' | 'go' | 'next' | 'search' | 'send';
};

export default function InputWithIcon({
  label,
  placeholder,
  value,
  onInputChange,
  icon,
  isPassword = false,
  type = 'text',
  keyboardType,
  autoCapitalize = 'none',
  disabled = false,
  hasError = false,
  errorMessage,
  containerStyle,
  maxLength,
  onSubmitEditing,
  returnKeyType,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const getKeyboardType = (): KeyboardTypeOptions => {
    if (keyboardType) return keyboardType;
    if (type === 'email') return 'email-address';
    if (type === 'number') return 'numeric';
    return 'default';
  };

  const isSecure = isPassword && !showPassword;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasError && styles.inputWrapperError,
          disabled && styles.inputWrapperDisabled,
        ]}
      >
        {icon && <View style={styles.iconLeft}>{icon}</View>}

        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onInputChange}
          secureTextEntry={isSecure}
          keyboardType={getKeyboardType()}
          autoCapitalize={type === 'email' ? 'none' : autoCapitalize}
          autoCorrect={false}
          editable={!disabled}
          maxLength={maxLength}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.passwordToggle}
            onPress={() => setShowPassword((prev) => !prev)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {showPassword ? <EyeOffIcon size={20} color="#6B7280" /> : <EyeIcon size={20} color="#6B7280" />}
          </TouchableOpacity>
        )}
      </View>

      {hasError && errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperFocused: {
    borderColor: '#F26430',
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  inputWrapperDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  iconLeft: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    paddingVertical: 0,
    height: '100%',
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  passwordToggle: {
    padding: 4,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
