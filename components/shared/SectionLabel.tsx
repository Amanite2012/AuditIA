/**
 * Libellé de section « eyebrow » — majuscules interlettrées, registre
 * papier à en-tête. Composant UI pur.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';

import { colors, eyebrowLetterSpacing, fonts, fontSizes } from './theme';

export function SectionLabel({ children }: { children: string }): React.ReactElement {
  return <Text style={styles.label}>{children.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
    fontFamily: fonts.medium,
    letterSpacing: eyebrowLetterSpacing,
  },
});
