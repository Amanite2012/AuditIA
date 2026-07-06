import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fontSizes, spacing, touchTargetMinHeight } from './theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
}

const VARIANT_COLORS: Record<NonNullable<AppButtonProps['variant']>, { bg: string; fg: string }> = {
  primary: { bg: colors.accent, fg: '#0B1220' },
  secondary: { bg: colors.surfaceRaised, fg: colors.text },
  success: { bg: colors.success, fg: '#0B1220' },
  warning: { bg: colors.warning, fg: '#0B1220' },
  danger: { bg: colors.danger, fg: '#0B1220' },
};

/** Bouton standard : cible tactile ≥ 48pt [UX-CRIT-01], texte ≥ 16sp (7.4). */
export function AppButton({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  style,
  accessibilityHint,
  testID,
}: AppButtonProps): React.ReactElement {
  const palette = VARIANT_COLORS[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: palette.fg }]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTargetMinHeight,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    textAlign: 'center',
  },
});
