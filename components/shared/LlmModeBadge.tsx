/**
 * Indicateur discret permanent du mode IA actif — [DECISION-05] / ACC-11.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LlmMode } from '../../types';
import { colors, fontSizes, spacing } from './theme';

const LABELS: Record<LlmMode, string> = {
  full: 'IA locale',
  degraded: 'IA réduite',
  none: 'Sans IA',
};

export function LlmModeBadge({ mode }: { mode: LlmMode }): React.ReactElement {
  return (
    <View style={styles.badge} accessibilityLabel={`Mode IA actif : ${LABELS[mode]}`}>
      <Text style={styles.text}>{LABELS[mode]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
});
