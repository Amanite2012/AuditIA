/**
 * En-tête d'écran — eyebrow de module, titre serif, filet fin.
 * Donne aux quatre modules le registre d'un document d'audit.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SectionLabel } from './SectionLabel';
import { colors, fonts, fontSizes, spacing } from './theme';

interface ScreenHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  /** Élément aligné à droite du titre (badge de mode IA, minuteur…). */
  trailing?: React.ReactNode;
}

export function ScreenHeader({ eyebrow, title, subtitle, trailing }: ScreenHeaderProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <View style={styles.titleRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {trailing}
      </View>
      {subtitle !== undefined && (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
      <View style={styles.rule} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    color: colors.text,
    fontSize: fontSizes.title,
    fontFamily: fonts.display,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.body,
  },
  rule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.sm,
  },
});
