import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';

import { colors, radius } from '@/src/theme/colors';

type Variant = 'green' | 'blue' | 'outline' | 'gray' | 'vip' | 'danger';

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, variant = 'green', disabled, style }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.base, style, variantStyles[variant], pressed && !disabled && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={[styles.label, labelStyles[variant]]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'stretch',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.45,
  },
});

const variantStyles: Record<Variant, ViewStyle> = {
  green: { backgroundColor: colors.green },
  blue: { backgroundColor: colors.blue },
  outline: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.green },
  gray: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  vip: { backgroundColor: colors.amber },
  danger: { backgroundColor: colors.redLight, borderWidth: 1, borderColor: '#FFCDD2' },
};

const labelStyles: Record<Variant, TextStyle> = {
  green: { color: '#fff' },
  blue: { color: '#fff' },
  outline: { color: colors.greenDark },
  gray: { color: colors.mid },
  vip: { color: '#fff' },
  danger: { color: '#C0392B' },
};
