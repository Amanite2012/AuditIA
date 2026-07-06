import React from 'react';
import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fonts, fontSizes, radii, spacing, touchTargetMinHeight } from './theme';

interface AppButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * Registre sobre : seul `primary` est plein (claret). Les statuts sont des
 * boutons « quiets » — fond surface, bordure de la marque de statut, libellé
 * dans la teinte texte du statut (contraste AA vérifié dans theme.ts).
 */
const VARIANTS: Record<
  NonNullable<AppButtonProps['variant']>,
  { bg: string; fg: string; borderColor: string }
> = {
  primary: { bg: colors.accent, fg: colors.onAccent, borderColor: colors.accent },
  secondary: { bg: 'transparent', fg: colors.text, borderColor: colors.border },
  success: { bg: colors.surface, fg: colors.successText, borderColor: colors.success },
  warning: { bg: colors.surface, fg: colors.warningText, borderColor: colors.warning },
  danger: { bg: colors.surface, fg: colors.dangerText, borderColor: colors.danger },
};

/** Bouton standard : cible tactile ≥ 52pt [UX-CRIT-01], texte ≥ 16sp (7.4). */
export function AppButton({
  label,
  onPress,
  variant = 'secondary',
  disabled = false,
  style,
  accessibilityHint,
  testID,
}: AppButtonProps): React.ReactElement {
  const palette = VARIANTS[variant];
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
        {
          backgroundColor: palette.bg,
          borderColor: palette.borderColor,
          opacity: disabled ? 0.4 : pressed ? 0.72 : 1,
        },
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
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
});
