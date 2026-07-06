/**
 * Indicateur de couverture temps réel [ENT-06] — progress bar discrète (7.2).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fontSizes, spacing } from '../shared/theme';

export function CoverageBar({ percent }: { percent: number }): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.row} accessibilityLabel={`Couverture : ${clamped} pour cent`}>
      <Text style={styles.label}>Couverture</Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clamped}%` }]} />
      </View>
      <Text style={styles.percent}>{clamped}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  percent: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'right',
  },
});
