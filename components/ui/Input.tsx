import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { cn } from '../../lib/cn';
import { useTheme } from '../../hooks/useTheme';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export const Input = ({ label, error, onFocus, onBlur, ...props }: InputProps) => {
  // placeholderTextColor is a prop, not a style — needs the raw palette value.
  const { palette } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="text-text-muted text-xs font-bold uppercase tracking-wider">{label}</Text>
      ) : null}
      <TextInput
        className={cn(
          'bg-surface-raised text-text-primary rounded-2xl border-2 px-4 py-3.5 text-base',
          error ? 'border-danger' : focused ? 'border-accent-info' : 'border-border',
        )}
        placeholderTextColor={palette['text-muted']}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        {...props}
      />
      {error ? <Text className="text-danger text-xs font-semibold">{error}</Text> : null}
    </View>
  );
};
