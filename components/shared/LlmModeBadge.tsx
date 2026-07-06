/**
 * Indicateur discret permanent du mode IA actif — [DECISION-05] / ACC-11.
 * Pastille + libellé : le statut n'est jamais porté par la couleur seule.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LlmMode } from '../../types';
import { colors, fonts, fontSizes, radii, spacing } from './theme';

const LABELS: Record<LlmMode, string> = {
  full: 'IA locale',
  degraded: 'IA réduite',
  none: 'Sans IA',
};

const DOT_COLORS: Record<LlmMode, string> = {
  full: colors.successText,
  degraded: colors.warningText,
  none: colors.textMuted,
};

export function LlmModeBadge({ mode }: { mode: LlmMode }): React.ReactElement {
  return (
    <View style={styles.badge} accessibilityLabel={`Mode IA actif : ${LABELS[mode]}`}>
      <View style={[styles.dot, { backgroundColor: DOT_COLORS[mode] }]} />
      <Text style={styles.text}>{LABELS[mode]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontFamily: fonts.text,
  },
});
