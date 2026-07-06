/**
 * Indicateur de couverture temps réel [ENT-06] — jauge fine (7.2).
 * Discipline dataviz : marque fine (5px), extrémité arrondie ancrée à
 * l'origine, valeur portée par un jeton texte (jamais la couleur seule).
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, fontSizes, spacing } from '../shared/theme';

interface CoverageBarProps {
  percent: number;
  /** Libellé affiché à gauche (masqué si vide, ex. jauges par domaine). */
  label?: string;
}

export function CoverageBar({ percent, label = 'Couverture' }: CoverageBarProps): React.ReactElement {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.row} accessibilityLabel={`${label || 'Couverture'} : ${clamped} pour cent`}>
      {label !== '' && <Text style={styles.label}>{label}</Text>}
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
    gap: spacing.sm + 2,
  },
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontFamily: fonts.text,
  },
  track: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.surfaceRaised,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: colors.accentText,
  },
  percent: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
    textAlign: 'right',
  },
});
